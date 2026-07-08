import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { VaultFile } from "./types";

type VaultDb = Pick<Prisma.TransactionClient, "vaultFile">;

/**
 * Vault storage backed by Postgres via Prisma.
 * `vaultPath` is the user's `vaultPath` field (e.g. "vaults/user_abc/").
 * We use it only to derive the userId via DB lookup — all file ops go
 * through the VaultFile table keyed by (userId, path).
 *
 * All functions keep the same signature as the old fs-based version so
 * call sites don't need to change.
 */

/** Resolve the internal userId from a vaultPath string. */
async function userIdFromVaultPath(vaultPath: string): Promise<string> {
  const user = await prisma.user.findFirst({
    where: { vaultPath },
    select: { id: true },
  });
  if (!user) throw new Error(`No user found for vaultPath: ${vaultPath}`);
  return user.id;
}

export async function readVaultFile(vaultPath: string, filename: string): Promise<string> {
  const userId = await userIdFromVaultPath(vaultPath);
  const row = await prisma.vaultFile.findUnique({
    where: { userId_path: { userId, path: filename } },
    select: { content: true },
  });
  if (!row) throw new Error(`Vault file not found: ${filename}`);
  return row.content;
}

export async function writeVaultFile(
  vaultPath: string,
  filename: string,
  content: string
): Promise<void> {
  const userId = await userIdFromVaultPath(vaultPath);
  await prisma.vaultFile.upsert({
    where: { userId_path: { userId, path: filename } },
    create: { userId, path: filename, content },
    update: { content },
  });
}

export async function listVaultFiles(vaultPath: string): Promise<string[]> {
  try {
    const userId = await userIdFromVaultPath(vaultPath);
    return await listVaultFilesForUser(userId);
  } catch {
    return [];
  }
}

/** List vault paths for an already-authenticated internal Mora user. */
export async function listVaultFilesForUser(userId: string): Promise<string[]> {
  const rows = await prisma.vaultFile.findMany({
    where: { userId },
    select: { path: true },
  });
  return rows.map((row) => row.path);
}

export async function readMultipleVaultFiles(
  vaultPath: string,
  filenames: string[]
): Promise<Record<string, string>> {
  if (filenames.length === 0) return {};
  const userId = await userIdFromVaultPath(vaultPath);
  const rows = await prisma.vaultFile.findMany({
    where: { userId, path: { in: filenames } },
    select: { path: true, content: true },
  });
  const results: Record<string, string> = {};
  for (const row of rows) results[row.path] = row.content;
  return results;
}

export async function writeMultipleVaultFiles(
  vaultPath: string,
  files: VaultFile[]
): Promise<void> {
  if (files.length === 0) return;
  const userId = await userIdFromVaultPath(vaultPath);
  await writeMultipleVaultFilesForUser(userId, files);
}

/** Write vault files for an already-authenticated internal Mora user. */
export async function writeMultipleVaultFilesForUser(
  userId: string,
  files: VaultFile[],
  db: VaultDb = prisma
): Promise<void> {
  if (files.length === 0) return;
  // Upsert each file — Prisma doesn't support bulk upsert natively, so batch
  await Promise.all(
    files.map((f) =>
      db.vaultFile.upsert({
        where: { userId_path: { userId, path: f.path } },
        create: { userId, path: f.path, content: f.content },
        update: { content: f.content },
      })
    )
  );
}

export async function readAllVaultFiles(
  vaultPath: string
): Promise<Record<string, string>> {
  try {
    const userId = await userIdFromVaultPath(vaultPath);
    return readAllVaultFilesForUser(userId);
  } catch {
    return {};
  }
}

/** Read a vault for an already-authenticated internal Mora user. */
export async function readAllVaultFilesForUser(
  userId: string,
  db: VaultDb = prisma
): Promise<Record<string, string>> {
  const rows = await db.vaultFile.findMany({
    where: { userId },
    select: { path: true, content: true },
  });
  const results: Record<string, string> = {};
  for (const row of rows) results[row.path] = row.content;
  return results;
}

/**
 * Serialize read-modify-write vault operations for one user across Vercel
 * instances. Locking the owning user row avoids unsupported Postgres `void`
 * results from advisory-lock functions and lasts only for this transaction.
 */
export async function withUserVaultWriteLock<T>(
  userId: string,
  work: (db: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    const lockedUsers = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE
    `;
    if (lockedUsers.length !== 1) {
      throw new Error("Mora user not found for vault write.");
    }
    return work(tx);
  });
}

/**
 * Delete all vault files for a user — called when deleting an account.
 * Prisma cascade handles this automatically via the schema relation,
 * but this can be called explicitly if needed.
 */
export async function deleteAllVaultFiles(vaultPath: string): Promise<void> {
  const userId = await userIdFromVaultPath(vaultPath);
  await prisma.vaultFile.deleteMany({ where: { userId } });
}
