import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ingestMemory } from "@/lib/pipelines/memory-ingest";
import type { MemoryUpdate, Message } from "@/lib/vault/types";

async function attachMemoryUpdate(
  conversationId: string,
  messages: Message[],
  update: MemoryUpdate
): Promise<void> {
  let targetIndex = -1;
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    if (messages[index].role === "assistant") {
      targetIndex = index;
      break;
    }
  }
  if (targetIndex === -1) return;

  const updatedMessages = messages.map((message, index) =>
    index === targetIndex ? { ...message, memoryUpdate: update } : message
  );

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { messages: updatedMessages as unknown as Prisma.InputJsonValue },
  });
}
/**
 * Update the web app's shared memory after a completed Mora conversation.
 * MCP memory writes use a separate deterministic path so connector requests do
 * not invoke a second language model.
 */
export async function triggerPostChatIngest(
  userId: string,
  conversationId: string
): Promise<void> {
  try {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, userId },
    });
    if (!conversation) return;

    const messages = conversation.messages as unknown as Message[];
    if (!messages || messages.length < 2) return;

    const update = await ingestMemory({
      userId,
      transcript: messages,
      action: "memory.update",
      bootstrapIfEmpty: true,
    });
    await attachMemoryUpdate(conversationId, messages, update);
  } catch (error) {
    console.error("[post-chat-ingest] failed:", error);
  }
}
