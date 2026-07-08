import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  verifyWebhook: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@clerk/nextjs/webhooks", () => ({
  verifyWebhook: mocks.verifyWebhook,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      create: mocks.create,
    },
  },
}));

import { POST } from "@/app/api/webhooks/clerk/route";

function userCreatedEvent() {
  return {
    type: "user.created",
    data: {
      id: "user_prod",
      primary_email_address_id: "email_primary",
      email_addresses: [
        {
          id: "email_primary",
          email_address: "Person@Example.com",
          verification: { status: "verified" },
        },
      ],
      first_name: "Test",
      last_name: "Person",
    },
  };
}

describe("Clerk webhook", () => {
  beforeEach(() => {
    mocks.verifyWebhook.mockResolvedValue(userCreatedEvent());
    mocks.findUnique.mockResolvedValue(null);
    mocks.findFirst.mockResolvedValue(null);
    mocks.create.mockResolvedValue({ id: "mora-user" });
  });

  it("rejects requests that fail Clerk signature verification", async () => {
    mocks.verifyWebhook.mockRejectedValueOnce(new Error("bad signature"));

    const response = await POST(new NextRequest("https://mora.example/api/webhooks/clerk"));

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates a normalized user from a verified signed event", async () => {
    const response = await POST(new NextRequest("https://mora.example/api/webhooks/clerk"));

    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        clerkId: "user_prod",
        email: "person@example.com",
        name: "Test Person",
        vaultPath: "vaults/user_prod/",
      },
    });
  });

  it("acknowledges a duplicate-delivery create race after re-reading the row", async () => {
    mocks.create.mockRejectedValueOnce({ code: "P2002" });
    mocks.findFirst.mockResolvedValueOnce({ id: "mora-user", clerkId: "user_prod" });

    const response = await POST(new NextRequest("https://mora.example/api/webhooks/clerk"));

    expect(response.status).toBe(200);
  });

  it("does not let the webhook relink a legacy row by email", async () => {
    mocks.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "legacy", clerkId: "user_dev" });

    const response = await POST(new NextRequest("https://mora.example/api/webhooks/clerk"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.accountLinkPending).toBe(true);
    expect(mocks.create).not.toHaveBeenCalled();
  });
});
