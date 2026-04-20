import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { readEnv } from "@/lib/models";
import {
  readVaultFile,
  readAllVaultFiles,
  writeMultipleVaultFiles,
} from "@/lib/vault/storage";
import { applyVaultOperations } from "@/lib/vault/writer";
import { buildPostChatUpdatePrompt } from "@/lib/prompts/post-chat-update";
import type {
  Message,
  VaultOperations,
  VaultFile,
  MemoryUpdate,
  MemoryUpdateChange,
} from "@/lib/vault/types";

/**
 * Grab a short snippet of a string's content for diff display.
 */
function snippet(text: string, maxChars = 240): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;
  return trimmed.slice(0, maxChars).trimEnd() + "…";
}

/**
 * For an "update" op that targets a section, extract the before/after section body.
 */
function extractSection(fileContent: string, section: string): string | undefined {
  const header = `## ${section}`;
  const idx = fileContent.indexOf(header);
  if (idx === -1) return undefined;
  const after = fileContent.slice(idx + header.length);
  const nextSection = after.match(/\n## /);
  const end = nextSection ? idx + header.length + (nextSection.index ?? 0) : fileContent.length;
  return fileContent.slice(idx, end).trim();
}

/**
 * Build a MemoryUpdate payload from the vault operations we just applied.
 */
function buildMemoryUpdate(
  ops: VaultOperations,
  before: Record<string, string>,
  after: Record<string, string>,
  durationMs: number
): MemoryUpdate {
  const changes: MemoryUpdateChange[] = [];

  for (const op of ops.operations) {
    const beforeContent = before[op.filepath];
    const afterContent = after[op.filepath] ?? op.content;

    let diff: MemoryUpdateChange["diff"] | undefined;

    if (op.action === "update" && op.section && beforeContent) {
      const beforeSection = extractSection(beforeContent, op.section);
      const afterSection = extractSection(afterContent, op.section);
      if (afterSection) {
        diff = {
          before: beforeSection ? snippet(beforeSection) : undefined,
          after: snippet(afterSection),
        };
      }
    } else if (op.action === "append") {
      diff = { after: snippet(op.content) };
    } else if (op.action === "create") {
      diff = { after: snippet(op.content) };
    } else if (op.action === "update") {
      diff = {
        before: beforeContent ? snippet(beforeContent) : undefined,
        after: snippet(afterContent),
      };
    }

    const summary =
      op.action === "create"
        ? `Created ${op.filepath}`
        : op.action === "append"
          ? `Added to ${op.filepath}`
          : op.section
            ? `Updated ${op.filepath} › ${op.section}`
            : `Updated ${op.filepath}`;

    changes.push({
      filepath: op.filepath,
      action: op.action,
      section: op.section ?? null,
      summary,
      diff,
    });
  }

  const overallSummary =
    changes.length === 1
      ? changes[0].summary
      : `${changes.length} memory updates`;

  return {
    changes,
    summary: overallSummary,
    durationMs,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Build an empty/no-op MemoryUpdate so the client polling loop can exit quickly
 * even when we decided nothing was worth recording.
 */
function buildEmptyMemoryUpdate(durationMs: number): MemoryUpdate {
  return {
    changes: [],
    summary: "No memory changes",
    durationMs,
    completedAt: new Date().toISOString(),
  };
}

/**
 * Attach a no-op MemoryUpdate using messages we already have in memory.
 * Avoids an extra DB read — always pass messages when available.
 */
async function attachNoopUpdate(
  conversationId: string,
  startedAt: number,
  messages: Message[]
): Promise<void> {
  try {
    await attachMemoryUpdate(
      conversationId,
      messages,
      buildEmptyMemoryUpdate(Date.now() - startedAt)
    );
  } catch (err) {
    console.error("[post-chat-ingest] attachNoopUpdate failed:", err);
  }
}

/**
 * Attach a MemoryUpdate to the most recent assistant message of the conversation.
 */
async function attachMemoryUpdate(
  conversationId: string,
  messages: Message[],
  update: MemoryUpdate
): Promise<void> {
  // Find the last assistant message index
  let targetIndex = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "assistant") {
      targetIndex = i;
      break;
    }
  }
  if (targetIndex === -1) return;

  const updatedMessages = messages.map((m, i) =>
    i === targetIndex ? { ...m, memoryUpdate: update } : m
  );

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { messages: updatedMessages as unknown as Prisma.InputJsonValue },
  });
}

/**
 * Trigger post-chat vault update for a conversation.
 * This is fire-and-forget — errors are logged but don't propagate.
 */
export async function triggerPostChatIngest(
  userId: string,
  conversationId: string
): Promise<void> {
  const startedAt = Date.now();
  let loadedMessages: Message[] = [];
  try {
    // 1. Load conversation from DB
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { user: true },
    });

    if (!conversation) {
      console.error(`Conversation ${conversationId} not found`);
      return;
    }

    const messages = conversation.messages as unknown as Message[];
    if (!messages || messages.length < 2) {
      return;
    }
    loadedMessages = messages;

    const vaultPath = conversation.user.vaultPath;

    // 2. Read vault index
    let indexContent = "";
    try {
      indexContent = await readVaultFile(vaultPath, "_index.md");
    } catch {
      await attachNoopUpdate(conversationId, startedAt, messages);
      return;
    }

    // 3. Read all current vault files
    const allFiles = await readAllVaultFiles(vaultPath);

    // 4. Build update prompt
    const prompt = buildPostChatUpdatePrompt(messages, indexContent, allFiles);

    // 5. Call best available provider (Anthropic Sonnet > OpenAI GPT-4o fallback)
    let text = "";
    const anthropicKey = readEnv("ANTHROPIC_API_KEY");
    if (anthropicKey) {
      try {
        const { anthropic } = await import("@/lib/anthropic");
        const response = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 4096,
          messages: [{ role: "user", content: prompt }],
        });
        const block = response.content[0];
        text = block.type === "text" ? block.text : "";
      } catch (err: unknown) {
        const status = (err as { status?: number })?.status;
        // Fall back to OpenAI on any auth/rate-limit/quota error
        if (status === 401 || status === 403 || status === 429 || status === 529) {
          console.warn(`[post-chat-ingest] Anthropic error (${status}), falling back to OpenAI`);
        } else {
          console.error("[post-chat-ingest] Anthropic unexpected error:", err);
          // Still fall through to OpenAI rather than crashing
        }
      }
    }

    if (!text) {
      const openaiKey = readEnv("OPENAI_API_KEY");
      if (!openaiKey) {
        console.warn("[post-chat-ingest] no LLM provider configured, skipping");
        await attachNoopUpdate(conversationId, startedAt, messages);
        return;
      }
      const { openai } = await import("@/lib/openai");
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      });
      text = response.choices[0]?.message?.content ?? "";
    }

    // 6. Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Post-chat ingest: no JSON in response");
      await attachNoopUpdate(conversationId, startedAt, messages);
      return;
    }

    const ops: VaultOperations = JSON.parse(jsonMatch[0]);

    if (!ops.operations || !Array.isArray(ops.operations)) {
      console.error("Post-chat ingest: invalid operations structure");
      await attachNoopUpdate(conversationId, startedAt, messages);
      return;
    }

    if (ops.operations.length === 0) {
      console.log("[post-chat-ingest] no updates needed");
      await attachNoopUpdate(conversationId, startedAt, messages);
      return;
    }

    // 7. Apply operations
    const updatedFiles = applyVaultOperations(allFiles, ops);

    // 8. Write changed files
    const changedFiles: VaultFile[] = [];
    for (const [path, content] of Object.entries(updatedFiles)) {
      if (content !== allFiles[path]) {
        changedFiles.push({ path, content });
      }
    }

    if (changedFiles.length === 0) {
      console.log("[post-chat-ingest] ops produced no file changes");
      await attachNoopUpdate(conversationId, startedAt, messages);
      return;
    }

    await writeMultipleVaultFiles(vaultPath, changedFiles);

    // 9. Build MemoryUpdate summary and attach to the assistant message
    const durationMs = Date.now() - startedAt;
    const memoryUpdate = buildMemoryUpdate(ops, allFiles, updatedFiles, durationMs);
    await attachMemoryUpdate(conversationId, messages, memoryUpdate);

    console.log(
      `[post-chat-ingest] wrote ${changedFiles.length} files in ${durationMs}ms for conversation ${conversationId}`
    );
  } catch (error) {
    console.error("[post-chat-ingest] failed:", error);
    if (loadedMessages.length > 0) {
      await attachNoopUpdate(conversationId, startedAt, loadedMessages);
    }
  }
}
