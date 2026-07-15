import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  ingestMemory: vi.fn(),
  recordClaudeMemorySyncBaseline: vi.fn(),
  userUpdate: vi.fn(),
}));

vi.mock("@/lib/pipelines/memory-ingest", () => ({ ingestMemory: mocks.ingestMemory }));
vi.mock("@/lib/mcp/claude-memory-sync", () => ({
  recordClaudeMemorySyncBaseline: mocks.recordClaudeMemorySyncBaseline,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { update: mocks.userUpdate } },
}));

import { enrollFromClaudeMemory } from "@/lib/mcp/enrollment";

describe("Claude memory enrollment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.ingestMemory.mockResolvedValue({ changes: [], summary: "No memory changes" });
    mocks.recordClaudeMemorySyncBaseline.mockResolvedValue("2026-07-15T12:00:00.000Z");
    mocks.userUpdate.mockResolvedValue({});
  });

  it("records the enrolled snapshot as the ongoing-sync baseline", async () => {
    const snapshot = "The user works best before noon and is launching Mora.";
    await enrollFromClaudeMemory("user-a", snapshot);

    expect(mocks.ingestMemory).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-a", bootstrapIfEmpty: true })
    );
    expect(mocks.recordClaudeMemorySyncBaseline).toHaveBeenCalledWith("user-a", snapshot);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-a" },
      data: { onboardingComplete: true, importStatus: "claude_memory" },
    });
  });
});
