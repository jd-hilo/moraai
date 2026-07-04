import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
  getUser: vi.fn(),
  getUserList: vi.fn(),
  findUnique: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  clerkClient: mocks.clerkClient,
}));

vi.mock("@clerk/backend/errors", () => ({
  isClerkAPIResponseError: (error: unknown) =>
    typeof error === "object" &&
    error !== null &&
    "isClerkApiError" in error,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
      create: mocks.create,
      update: mocks.update,
    },
  },
}));

import {
  getOrCreateUserByClerkId,
  MoraIdentityConflictError,
} from "@/lib/get-or-create-user";

function clerkUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user_prod",
    primaryEmailAddressId: "email_primary",
    emailAddresses: [
      {
        id: "email_primary",
        emailAddress: "Person@Example.com",
        verification: { status: "verified" },
      },
    ],
    firstName: "Test",
    lastName: "Person",
    ...overrides,
  };
}

describe("getOrCreateUserByClerkId", () => {
  beforeEach(() => {
    mocks.clerkClient.mockResolvedValue({
      users: {
        getUser: mocks.getUser,
        getUserList: mocks.getUserList,
      },
    });
    mocks.getUser.mockImplementation(async (clerkId: string) => {
      if (clerkId === "user_dev") {
        throw { isClerkApiError: true, status: 404 };
      }
      return clerkUser({ id: clerkId });
    });
    mocks.getUserList.mockResolvedValue({
      data: [clerkUser()],
      totalCount: 1,
    });
  });

  it("returns an existing Clerk-linked Mora user without consulting Clerk again", async () => {
    const existing = {
      id: "mora_existing",
      clerkId: "user_prod",
      email: "person@example.com",
      vaultPath: "vaults/legacy/",
    };
    mocks.findUnique.mockResolvedValueOnce(existing);

    await expect(getOrCreateUserByClerkId("user_prod")).resolves.toBe(existing);
    expect(mocks.clerkClient).not.toHaveBeenCalled();
  });

  it("relinks a legacy row after unique verified-email ownership is proven", async () => {
    const legacy = {
      id: "mora_legacy",
      clerkId: "user_dev",
      email: "person@example.com",
      vaultPath: "vaults/user_dev/",
    };
    const migrated = { ...legacy, clerkId: "user_prod", name: "Test Person" };
    mocks.findUnique.mockResolvedValueOnce(null);
    mocks.findMany.mockResolvedValueOnce([legacy]);
    mocks.update.mockResolvedValue(migrated);

    await expect(getOrCreateUserByClerkId("user_prod")).resolves.toEqual(migrated);
    expect(mocks.getUserList).toHaveBeenCalledWith({
      emailAddress: ["person@example.com"],
      limit: 2,
    });
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "mora_legacy" },
      data: {
        clerkId: "user_prod",
        email: "person@example.com",
        name: "Test Person",
      },
    });
    expect(mocks.update.mock.calls[0]?.[0].data).not.toHaveProperty("vaultPath");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("does not link an unverified primary email", async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    mocks.getUser.mockResolvedValueOnce(
      clerkUser({
        emailAddresses: [
          {
            id: "email_primary",
            emailAddress: "person@example.com",
            verification: { status: "unverified" },
          },
        ],
      })
    );

    await expect(getOrCreateUserByClerkId("user_prod")).resolves.toBeNull();
    expect(mocks.getUserList).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("fails closed when the verified email is ambiguous in Clerk", async () => {
    const legacy = {
      id: "mora_legacy",
      clerkId: "user_dev",
      email: "person@example.com",
    };
    mocks.findUnique.mockResolvedValueOnce(null);
    mocks.findMany.mockResolvedValueOnce([legacy]);
    mocks.getUserList.mockResolvedValueOnce({
      data: [clerkUser(), clerkUser({ id: "user_other" })],
      totalCount: 2,
    });

    await expect(getOrCreateUserByClerkId("user_prod")).rejects.toBeInstanceOf(
      MoraIdentityConflictError
    );
    expect(mocks.update).not.toHaveBeenCalled();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates a new Mora row when no Clerk ID or email match exists", async () => {
    const created = {
      id: "mora_new",
      clerkId: "user_prod",
      email: "person@example.com",
      vaultPath: "vaults/user_prod/",
    };
    mocks.findUnique.mockResolvedValueOnce(null);
    mocks.findMany.mockResolvedValueOnce([]);
    mocks.create.mockResolvedValueOnce(created);

    await expect(getOrCreateUserByClerkId("user_prod")).resolves.toEqual(created);
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        clerkId: "user_prod",
        email: "person@example.com",
        name: "Test Person",
        vaultPath: "vaults/user_prod/",
      },
    });
  });

  it("rethrows transient Clerk failures instead of treating them as missing users", async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    const outage = { isClerkApiError: true, status: 503 };
    mocks.getUser.mockRejectedValueOnce(outage);

    await expect(getOrCreateUserByClerkId("user_prod")).rejects.toBe(outage);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("refuses to replace a row linked to another active production Clerk user", async () => {
    const existing = {
      id: "mora_existing",
      clerkId: "user_other",
      email: "person@example.com",
    };
    mocks.findUnique.mockResolvedValueOnce(null);
    mocks.findMany.mockResolvedValueOnce([existing]);
    mocks.getUser.mockImplementation(async (clerkId: string) => clerkUser({ id: clerkId }));

    await expect(getOrCreateUserByClerkId("user_prod")).rejects.toBeInstanceOf(
      MoraIdentityConflictError
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("fails closed when multiple Mora rows match the verified email", async () => {
    mocks.findUnique.mockResolvedValueOnce(null);
    mocks.findMany.mockResolvedValueOnce([
      { id: "mora-one", clerkId: "user_dev_one" },
      { id: "mora-two", clerkId: "user_dev_two" },
    ]);

    await expect(getOrCreateUserByClerkId("user_prod")).rejects.toBeInstanceOf(
      MoraIdentityConflictError
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
