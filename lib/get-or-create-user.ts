import { auth, clerkClient } from "@clerk/nextjs/server";
import { isClerkAPIResponseError } from "@clerk/backend/errors";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export class MoraIdentityConflictError extends Error {
  readonly code = "ACCOUNT_IDENTITY_CONFLICT";

  constructor() {
    super("Mora could not safely link this account.");
    this.name = "MoraIdentityConflictError";
  }
}

type ClerkClient = Awaited<ReturnType<typeof clerkClient>>;
type ClerkUser = Awaited<ReturnType<ClerkClient["users"]["getUser"]>>;

async function getClerkUserOrNull(
  clerk: ClerkClient,
  clerkId: string
): Promise<ClerkUser | null> {
  try {
    return await clerk.users.getUser(clerkId);
  } catch (error) {
    if (isClerkAPIResponseError(error) && error.status === 404) {
      return null;
    }
    throw error;
  }
}

async function linkVerifiedLegacyUser(
  clerk: ClerkClient,
  clerkUser: ClerkUser,
  existingByEmail: User,
  email: string,
  name: string | null
): Promise<User> {
  if (existingByEmail.clerkId === clerkUser.id) return existingByEmail;

  // Never replace a row that is still attached to another active user in the
  // current Clerk instance. Development-instance IDs return 404 here.
  const activeExistingIdentity = await getClerkUserOrNull(
    clerk,
    existingByEmail.clerkId
  );
  if (activeExistingIdentity) {
    throw new MoraIdentityConflictError();
  }

  const usersForEmail = await clerk.users.getUserList({
    emailAddress: [email],
    limit: 2,
  });
  const uniquelyOwnedByCurrentUser =
    usersForEmail.totalCount === 1 &&
    usersForEmail.data.length === 1 &&
    usersForEmail.data[0]?.id === clerkUser.id;

  if (!uniquelyOwnedByCurrentUser) {
    throw new MoraIdentityConflictError();
  }

  // Preserve Mora's internal user ID, vault path, and all related records.
  return prisma.user.update({
    where: { id: existingByEmail.id },
    data: {
      clerkId: clerkUser.id,
      email,
      name,
    },
  });
}

/**
 * Resolve a Mora user from a trusted Clerk user ID. This is shared by browser
 * sessions and OAuth-authenticated MCP requests so both surfaces enforce the
 * same tenant boundary.
 */
export async function getOrCreateUserByClerkId(clerkId: string): Promise<User | null> {
  const existing = await prisma.user.findUnique({
    where: { clerkId },
  });

  if (existing) return existing;

  const clerk = await clerkClient();
  const clerkUser = await getClerkUserOrNull(clerk, clerkId);
  if (!clerkUser) return null;

  const primaryEmail = clerkUser.emailAddresses.find(
    ({ id }) => id === clerkUser.primaryEmailAddressId
  );
  if (!primaryEmail || primaryEmail.verification?.status !== "verified") {
    return null;
  }

  const email = primaryEmail.emailAddress.trim().toLowerCase();
  if (!email) return null;

  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || null;

  const emailMatches = await prisma.user.findMany({
    where: { email: { equals: email, mode: "insensitive" } },
    take: 2,
  });
  if (emailMatches.length > 1) throw new MoraIdentityConflictError();
  const existingByEmail = emailMatches[0];

  if (existingByEmail) {
    return linkVerifiedLegacyUser(clerk, clerkUser, existingByEmail, email, name);
  }

  try {
    return await prisma.user.create({
      data: {
        clerkId: clerkUser.id,
        email,
        name,
        vaultPath: `vaults/${clerkUser.id}/`,
      },
    });
  } catch (error) {
    // A verified webhook or another request may have created the row between
    // our reads and create. Re-read only on a uniqueness race.
    if (
      typeof error !== "object" ||
      error === null ||
      !("code" in error) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
    const racedByClerkId = await prisma.user.findUnique({ where: { clerkId } });
    if (racedByClerkId) return racedByClerkId;
    const racedByEmail = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
    });
    if (!racedByEmail) throw error;
    return linkVerifiedLegacyUser(clerk, clerkUser, racedByEmail, email, name);
  }
}

/**
 * Gets the current browser-session user, creating their Mora row if the Clerk
 * webhook has not run yet.
 */
export async function getOrCreateUser(): Promise<User | null> {
  const { userId } = await auth();
  if (!userId) return null;
  return getOrCreateUserByClerkId(userId);
}
