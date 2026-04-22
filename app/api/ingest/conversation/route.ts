import { after } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { triggerPostChatIngest } from "@/lib/pipelines/post-chat-ingest";

export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return Response.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { conversationId } = body as { conversationId?: string };

    if (!conversationId) {
      return Response.json({ error: "conversationId is required" }, { status: 400 });
    }

    // Verify conversation belongs to user
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId, userId: user.id },
    });

    if (!conversation) {
      return Response.json({ error: "Conversation not found" }, { status: 404 });
    }

    // Trigger async ingest after the response is sent.
    // `after()` keeps the work alive on Vercel even after the lambda returns —
    // without it, fire-and-forget gets killed mid-execution.
    const uid = user.id;
    const cid = conversationId;
    after(async () => {
      await triggerPostChatIngest(uid, cid).catch((err) =>
        console.error("Post-chat ingest error:", err)
      );
    });

    return Response.json({ success: true, message: "Ingest triggered" });
  } catch (error) {
    console.error("Conversation ingest API error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
