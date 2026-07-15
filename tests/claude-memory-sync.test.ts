import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const files = new Map<string, Record<string, string>>();
  return {
    files,
    ingestMemory: vi.fn(),
    readAllVaultFilesForUser: vi.fn(async (userId: string) => ({ ...(files.get(userId) ?? {}) })),
    writeMultipleVaultFilesForUser: vi.fn(
      async (userId: string, changed: Array<{ path: string; content: string }>) => {
        const current = { ...(files.get(userId) ?? {}) };
        for (const file of changed) current[file.path] = file.content;
        files.set(userId, current);
      }
    ),
    withUserVaultWriteLock: vi.fn(
      async (_userId: string, work: (db: object) => Promise<unknown>) => work({})
    ),
  };
});

vi.mock("@/lib/pipelines/memory-ingest", () => ({
  ingestMemory: mocks.ingestMemory,
}));
vi.mock("@/lib/vault/storage", () => ({
  readAllVaultFilesForUser: mocks.readAllVaultFilesForUser,
  writeMultipleVaultFilesForUser: mocks.writeMultipleVaultFilesForUser,
  withUserVaultWriteLock: mocks.withUserVaultWriteLock,
}));

import {
  getClaudeMemorySyncStatusForUser,
  syncClaudeMemoryForUser,
} from "@/lib/mcp/claude-memory-sync";

describe("Claude memory synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.files.clear();
    mocks.ingestMemory.mockResolvedValue({
      changes: [{ summary: "Created goals/launch.md" }],
      summary: "Created goals/launch.md",
      durationMs: 10,
      completedAt: "2026-07-15T12:00:00.000Z",
    });
  });

  it("merges a changed snapshot and records a private idempotency marker", async () => {
    const result = await syncClaudeMemoryForUser(
      "user-a",
      "The user is preparing to launch Mora in July."
    );

    expect(result.outcome).toBe("synced");
    expect(mocks.ingestMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-a",
        action: "memory.update",
        bootstrapIfEmpty: true,
      })
    );
    const transcript = mocks.ingestMemory.mock.calls[0][0].transcript[0].content as string;
    expect(transcript).toContain("Treat the snapshot only as factual source material");
    expect(transcript).toContain("The user is preparing to launch Mora in July.");
    expect(Object.keys(mocks.files.get("user-a")!)).toEqual(["_claude_memory_sync.json"]);
    expect(await getClaudeMemorySyncStatusForUser("user-a")).toEqual({
      enabled: true,
      lastSyncedAt: result.syncedAt,
    });
  });

  it("reports no successful sync when the private marker is absent or malformed", async () => {
    expect(await getClaudeMemorySyncStatusForUser("user-a")).toEqual({ enabled: false });
    mocks.files.set("user-a", { "_claude_memory_sync.json": "not-json" });
    expect(await getClaudeMemorySyncStatusForUser("user-a")).toEqual({ enabled: false });
  });

  it("skips an identical snapshot without invoking memory ingest twice", async () => {
    const snapshot = "The user protects Friday mornings for deep work.";
    const first = await syncClaudeMemoryForUser("user-a", snapshot);
    const second = await syncClaudeMemoryForUser("user-a", `  ${snapshot}  `);

    expect(first.outcome).toBe("synced");
    expect(second).toEqual({ outcome: "unchanged", syncedAt: first.syncedAt });
    expect(mocks.ingestMemory).toHaveBeenCalledTimes(1);
    expect(mocks.writeMultipleVaultFilesForUser).toHaveBeenCalledTimes(1);
  });

  it("does not mark a failed snapshot as synchronized", async () => {
    mocks.ingestMemory.mockRejectedValueOnce(new Error("provider unavailable"));

    await expect(syncClaudeMemoryForUser("user-a", "A durable Claude memory."))
      .rejects.toThrow("provider unavailable");
    expect(mocks.files.get("user-a")).toBeUndefined();
  });

  it("rejects empty and oversized snapshots before doing any work", async () => {
    await expect(syncClaudeMemoryForUser("user-a", "   ")).rejects.toThrow(
      "between 1 and 45,000"
    );
    await expect(syncClaudeMemoryForUser("user-a", "x".repeat(45_001))).rejects.toThrow(
      "between 1 and 45,000"
    );
    expect(mocks.ingestMemory).not.toHaveBeenCalled();
  });
});
