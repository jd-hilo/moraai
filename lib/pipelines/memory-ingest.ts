import { z } from "zod";
import { requireCredits } from "@/lib/credits";
import { callLLM } from "@/lib/providers/call";
import { buildPostChatUpdatePrompt } from "@/lib/prompts/post-chat-update";
import {
  readAllVaultFilesForUser,
  withUserVaultWriteLock,
  writeMultipleVaultFilesForUser,
} from "@/lib/vault/storage";
import { applyVaultOperations } from "@/lib/vault/writer";
import type {
  MemoryUpdate,
  MemoryUpdateChange,
  Message,
  VaultFile,
  VaultOperations,
} from "@/lib/vault/types";

const operationSchema = z.object({
  action: z.enum(["create", "update", "append"]),
  filepath: z.string().min(1).max(240),
  content: z.string().max(20_000),
  section: z.string().max(160).nullable().optional(),
});

const operationsSchema = z.object({
  operations: z.array(operationSchema).max(25),
  index_updates: z
    .array(z.object({ slug: z.string().max(160), summary: z.string().max(500) }))
    .max(25)
    .default([]),
  log_entry: z.string().max(2_000).default("Memory updated."),
});

const ALLOWED_DIRECTORIES = new Set([
  "identity",
  "people",
  "goals",
  "patterns",
  "life",
  "decisions",
  "misc",
]);

const EMPTY_INDEX = "# Vault Index\n";
const EMPTY_LOG = "# Conversation Log\n\nRecent conversation updates will appear here.\n";

function isSafeVaultPath(filepath: string): boolean {
  if (filepath.includes("..") || filepath.startsWith("/") || !filepath.endsWith(".md")) {
    return false;
  }
  const [directory] = filepath.split("/");
  return ALLOWED_DIRECTORIES.has(directory) && filepath.split("/").length === 2;
}

function snippet(text: string, maxChars = 240): string {
  const trimmed = text.trim();
  return trimmed.length <= maxChars ? trimmed : `${trimmed.slice(0, maxChars).trimEnd()}…`;
}

function extractSection(fileContent: string, section: string): string | undefined {
  const header = `## ${section}`;
  const index = fileContent.indexOf(header);
  if (index === -1) return undefined;
  const after = fileContent.slice(index + header.length);
  const next = after.match(/\n## /);
  const end = next ? index + header.length + (next.index ?? 0) : fileContent.length;
  return fileContent.slice(index, end).trim();
}

function buildMemoryUpdate(
  operations: VaultOperations,
  before: Record<string, string>,
  after: Record<string, string>,
  durationMs: number
): MemoryUpdate {
  const changes: MemoryUpdateChange[] = operations.operations.map((operation) => {
    const beforeContent = before[operation.filepath];
    const afterContent = after[operation.filepath] ?? operation.content;
    let diff: MemoryUpdateChange["diff"];

    if (operation.action === "update" && operation.section && beforeContent) {
      const beforeSection = extractSection(beforeContent, operation.section);
      const afterSection = extractSection(afterContent, operation.section);
      if (afterSection) {
        diff = {
          before: beforeSection ? snippet(beforeSection) : undefined,
          after: snippet(afterSection),
        };
      }
    } else if (operation.action === "update") {
      diff = {
        before: beforeContent ? snippet(beforeContent) : undefined,
        after: snippet(afterContent),
      };
    } else {
      diff = { after: snippet(operation.content) };
    }

    const summary =
      operation.action === "create"
        ? `Created ${operation.filepath}`
        : operation.action === "append"
          ? `Added to ${operation.filepath}`
          : operation.section
            ? `Updated ${operation.filepath} › ${operation.section}`
            : `Updated ${operation.filepath}`;

    return {
      filepath: operation.filepath,
      action: operation.action,
      section: operation.section ?? null,
      summary,
      diff,
    };
  });

  return {
    changes,
    summary:
      changes.length === 0
        ? "No memory changes"
        : changes.length === 1
          ? changes[0].summary
          : `${changes.length} memory updates`,
    durationMs,
    completedAt: new Date().toISOString(),
  };
}

export interface IngestMemoryParams {
  userId: string;
  transcript: Message[];
  action: "memory.update";
  bootstrapIfEmpty?: boolean;
}

/**
 * Analyze a trusted transcript and apply structured, tenant-scoped vault
 * updates. Callers decide how the transcript was approved; this function owns
 * validation, metering, and safe writes.
 */
export async function ingestMemory(params: IngestMemoryParams): Promise<MemoryUpdate> {
  const startedAt = Date.now();
  const storedFiles = await readAllVaultFilesForUser(params.userId);

  if (!storedFiles["_index.md"] && !params.bootstrapIfEmpty) {
    return buildMemoryUpdate(
      { operations: [], index_updates: [], log_entry: "No vault to update." },
      storedFiles,
      storedFiles,
      Date.now() - startedAt
    );
  }

  await requireCredits(params.userId, 1);

  const promptFiles = { ...storedFiles };
  if (!promptFiles["_index.md"]) promptFiles["_index.md"] = EMPTY_INDEX;
  if (!promptFiles["_log.md"]) promptFiles["_log.md"] = EMPTY_LOG;

  const prompt = buildPostChatUpdatePrompt(
    params.transcript,
    promptFiles["_index.md"],
    promptFiles
  );
  const text = await callLLM({
    anthropicModel: "claude-haiku-4-5-20251001",
    openaiModel: "gpt-4o",
    prompt,
    maxTokens: 4096,
    userId: params.userId,
    action: params.action,
  });

  const json = text.match(/\{[\s\S]*\}/)?.[0];
  if (!json) throw new Error("Memory provider returned an invalid response.");

  const parsed = operationsSchema.parse(JSON.parse(json));
  const operations: VaultOperations = {
    ...parsed,
    operations: parsed.operations.filter((operation) => isSafeVaultPath(operation.filepath)),
  };

  return withUserVaultWriteLock(params.userId, async (db) => {
    const latestStoredFiles = await readAllVaultFilesForUser(params.userId, db);
    const currentFiles = { ...latestStoredFiles };
    if (!currentFiles["_index.md"]) currentFiles["_index.md"] = EMPTY_INDEX;
    if (!currentFiles["_log.md"]) currentFiles["_log.md"] = EMPTY_LOG;

    const updatedFiles = applyVaultOperations(currentFiles, operations);
    const changedFiles: VaultFile[] = Object.entries(updatedFiles)
      .filter(([path, content]) => content !== latestStoredFiles[path])
      .map(([path, content]) => ({ path, content }));

    if (changedFiles.length > 0) {
      await writeMultipleVaultFilesForUser(params.userId, changedFiles, db);
    }

    return buildMemoryUpdate(
      operations,
      currentFiles,
      updatedFiles,
      Date.now() - startedAt
    );
  });
}
