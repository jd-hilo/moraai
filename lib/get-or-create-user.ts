import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

/**
 * Gets the user from the DB, creating them if they don't exist yet.
 * This handles the case where the Clerk webhook hasn't been configured.
 */
export async function getOrCreateUser(): Promise<User | null> {
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const existing = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
  });

  if (existing) return existing;

  // User not in DB yet — create them (webhook may not be configured)
  const email = clerkUser.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  return prisma.user.create({
    data: {
      clerkId: clerkUser.id,
      email,
      name,
      vaultPath: `vaults/${clerkUser.id}/`,
    },
  });
}
