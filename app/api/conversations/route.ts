import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import type { Message } from "@/lib/vault/types";

export async function GET(request: Request) {
  try {
    const user = await getOrCreateUser();
    if (!user) {
      return Response.json({ conversations: [] });
    }

    // Check if requesting a specific conversation
    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (id) {
      const conversation = await prisma.conversation.findUnique({
        where: { id, userId: user.id },
      });

      if (!conversation) {
        return Response.json({ error: "Conversation not found" }, { status: 404 });
      }

      return Response.json({
        id: conversation.id,
        title: conversation.title,
        mode: conversation.mode,
        messages: conversation.messages as unknown as Message[],
        createdAt: conversation.createdAt.toISOString(),
      });
    }

    // Return list of recent conversations
    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        mode: true,
        messages: true,
        createdAt: true,
      },
    });

    const formatted = conversations.map((conv) => {
      const messages = conv.messages as unknown as Message[];
      const firstUserMessage = messages.find((m) => m.role === "user");
      const preview = firstUserMessage
        ? firstUserMessage.content.slice(0, 80)
        : "";

      return {
        id: conv.id,
        title: conv.title,
        mode: conv.mode,
        preview,
        createdAt: conv.createdAt.toISOString(),
      };
    });

    return Response.json({ conversations: formatted });
  } catch (error) {
    console.error("Conversations API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
