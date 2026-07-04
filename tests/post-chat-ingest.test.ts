import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  update: vi.fn(),
  ingestMemory: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}));

vi.mock("@/lib/pipelines/memory-ingest", () => ({
  ingestMemory: mocks.ingestMemory,
}));

import { triggerPostChatIngest } from "@/lib/pipelines/post-chat-ingest";

describe("post-chat memory ingest", () => {
  it("uses explicit tenant scope and bootstraps a first-time vault", async () => {
    const messages = [
      { role: "user", content: "I prefer mornings." },
      { role: "assistant", content: "Got it." },
    ];
    mocks.findUnique.mockResolvedValueOnce({ id: "conversation", messages });
    mocks.ingestMemory.mockResolvedValueOnce({
      changes: [],
      summary: "No memory changes",
      durationMs: 1,
      completedAt: "2026-01-01T00:00:00.000Z",
    });

    await triggerPostChatIngest("mora-user", "conversation");

    expect(mocks.findUnique).toHaveBeenCalledWith({
      where: { id: "conversation", userId: "mora-user" },
    });
    expect(mocks.ingestMemory).toHaveBeenCalledWith({
      userId: "mora-user",
      transcript: messages,
      action: "memory.update",
      bootstrapIfEmpty: true,
    });
  });
});
