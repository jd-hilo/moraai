import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Delete all user data. UserSettings/Conversation/Simulation don't have
    // onDelete: Cascade in the schema, so we delete them explicitly first.
    // VaultFile and UsageEvent cascade automatically.
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (user) {
      await prisma.$transaction([
        prisma.conversation.deleteMany({ where: { userId: user.id } }),
        prisma.simulation.deleteMany({ where: { userId: user.id } }),
        prisma.userSettings.deleteMany({ where: { userId: user.id } }),
        prisma.user.delete({ where: { id: user.id } }),
      ]);
    }

    // 2. Delete the Clerk account
    const clerk = await clerkClient();
    await clerk.users.deleteUser(userId);

    return Response.json({ success: true });
  } catch (err) {
    console.error("[delete-account]", err);
    return Response.json({ error: "Failed to delete account" }, { status: 500 });
  }
}
