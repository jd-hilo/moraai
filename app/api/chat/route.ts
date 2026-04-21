import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { readVaultFile, readMultipleVaultFiles, listVaultFiles } from "@/lib/vault/storage";
import { routeContext } from "@/lib/pipelines/context-router";
import { triggerPostChatIngest } from "@/lib/pipelines/post-chat-ingest";
import { buildChatSystemPrompt } from "@/lib/prompts/chat-system";
import { truncateToTokens } from "@/lib/utils";
import { streamChat } from "@/lib/providers/stream";
import { getDefaultModel, getModel } from "@/lib/models";
import { requireCredits, chargeUsage, CreditsExhaustedError } from "@/lib/credits";
import type { Message } from "@/lib/vault/types";

export async function POST(request: Request) {
  try {
    // 1. Auth + get or create user
    const user = await getOrCreateUser();
    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Check credits (weekly $5 budget). Reject if empty.
    try {
      await requireCredits(user.id, 1);
    } catch (err) {
      if (err instanceof CreditsExhaustedError) {
        return Response.json(
          {
            error: "Out of credits for this week.",
            credits: err.credits,
            resetsAt: err.creditsResetAt.toISOString(),
          },
          { status: 402 }
        );
      }
      throw err;
    }

    // 3. Parse request body
    const body = await request.json();
    const {
      conversationId,
      message,
      mode = "chat",
      model: modelIdFromBody,
    } = body as {
      conversationId?: string;
      message: string;
      mode?: string;
      model?: string;
    };

    // Resolve which model to use: request body > default
    const chosenModel =
      (modelIdFromBody && getModel(modelIdFromBody)) || getDefaultModel();

    if (!message || typeof message !== "string") {
      return Response.json({ error: "Message is required" }, { status: 400 });
    }

    // 4. Load conversation history + start context routing in parallel
    let conversation;
    let messages: Message[] = [];

    if (conversationId) {
      conversation = await prisma.conversation.findUnique({
        where: { id: conversationId, userId: user.id },
      });
      if (conversation) {
        messages = (conversation.messages as unknown as Message[]) || [];
      }
    }

    // Add user message
    const userMessage: Message = {
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    messages.push(userMessage);

    // 5 & 6. Read vault + route context in parallel with saving the conversation
    const vaultContextPromise = (async (): Promise<string> => {
      try {
        const indexContent = await readVaultFile(user.vaultPath, "_index.md");
        if (!indexContent) return "";

        const availablePaths = (await listVaultFiles(user.vaultPath)).filter(
          (p) => p.endsWith(".md") && !p.startsWith("_")
        );
        const relevantFiles = await routeContext(message, messages, indexContent, availablePaths);
        if (relevantFiles.length === 0) return "";

        const fileContents = await readMultipleVaultFiles(user.vaultPath, relevantFiles);
        const contextParts = Object.entries(fileContents).map(
          ([filename, content]) => `### ${filename}\n${content}`
        );
        const ctx = truncateToTokens(contextParts.join("\n\n"), 6000);
        console.log(`[chat] loaded ${relevantFiles.length} vault file(s), ${ctx.length} chars`);
        return ctx;
      } catch (err) {
        console.error("Context routing error:", err);
        return "";
      }
    })();

    // Save conversation to DB while context routing runs
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: message.slice(0, 80),
          mode: mode as string,
          messages: messages as unknown as Prisma.InputJsonValue,
        },
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { messages: messages as unknown as Prisma.InputJsonValue },
      });
    }

    // Wait for context (likely already done by the time DB write finishes)
    const vaultContext = await vaultContextPromise;

    // 7. Build system prompt
    const validMode = (["chat", "decisions", "simulations"].includes(mode) ? mode : "chat") as
      | "chat"
      | "decisions"
      | "simulations";
    const systemPrompt = buildChatSystemPrompt(user.name, vaultContext, validMode);

    // 8. Build message history for the provider
    const providerMessages = messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

    console.log(
      `[chat] streaming with model=${chosenModel.id} (${chosenModel.provider})`
    );

    // 9. Stream response via unified provider router
    const encoder = new TextEncoder();
    let fullAssistantContent = "";
    let streamUsage: { inputTokens: number; outputTokens: number; model: string } | null = null;

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const textChunk of streamChat({
            modelId: chosenModel.id,
            system: systemPrompt,
            messages: providerMessages,
            onUsage: (u) => {
              streamUsage = u;
            },
          })) {
            fullAssistantContent += textChunk;
            controller.enqueue(encoder.encode(textChunk));
          }

          controller.close();

          // Charge credits for this chat turn based on real token usage.
          if (streamUsage) {
            const u = streamUsage as { inputTokens: number; outputTokens: number; model: string };
            chargeUsage({
              userId: user.id,
              action: "chat",
              model: u.model,
              inputTokens: u.inputTokens,
              outputTokens: u.outputTokens,
            }).catch((err) => console.error("[credits] charge failed:", err));
          }

          // 10. Save assistant message after stream completes
          const assistantMessage: Message = {
            role: "assistant",
            content: fullAssistantContent,
            timestamp: new Date().toISOString(),
          };
          messages.push(assistantMessage);

          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              messages: messages as unknown as Prisma.InputJsonValue,
              updatedAt: new Date(),
            },
          });

          // 11. Trigger async vault update (fire and forget)
          triggerPostChatIngest(user.id, conversation.id).catch((err) =>
            console.error("Post-chat ingest error:", err)
          );
        } catch (error) {
          console.error("Stream error:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
        "X-Conversation-Id": conversation.id,
        "X-Model-Id": chosenModel.id,
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    const msg = error instanceof Error ? error.message : "Internal server error";
    return Response.json({ error: msg }, { status: 500 });
  }
}
