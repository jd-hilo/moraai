import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Delete all user data from DB (cascades to conversations, messages, etc.)
    await prisma.user.delete({ where: { clerkId: userId } });

    // 2. Delete the Clerk account
    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);

    return Response.json({ success: true });
  } catch (err) {
    console.error("[delete-account]", err);
    return Response.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
