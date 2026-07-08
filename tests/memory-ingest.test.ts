import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readAllVaultFilesForUser: vi.fn(),
  writeMultipleVaultFilesForUser: vi.fn(),
  withUserVaultWriteLock: vi.fn(
    async (_userId: string, work: (db: object) => Promise<unknown>) => work({})
  ),
  requireCredits: vi.fn(),
  callLLM: vi.fn(),
}));

vi.mock("@/lib/vault/storage", () => ({
  readAllVaultFilesForUser: mocks.readAllVaultFilesForUser,
  writeMultipleVaultFilesForUser: mocks.writeMultipleVaultFilesForUser,
  withUserVaultWriteLock: mocks.withUserVaultWriteLock,
}));
vi.mock("@/lib/credits", () => ({ requireCredits: mocks.requireCredits }));
vi.mock("@/lib/providers/call", () => ({ callLLM: mocks.callLLM }));

import { ingestMemory } from "@/lib/pipelines/memory-ingest";

describe("ingestMemory", () => {
  beforeEach(() => {
    mocks.readAllVaultFilesForUser.mockResolvedValue({});
    mocks.writeMultipleVaultFilesForUser.mockResolvedValue(undefined);
    mocks.requireCredits.mockResolvedValue({ credits: 500 });
  });

  it("bootstraps an empty vault and writes an approved first memory", async () => {
    mocks.callLLM.mockResolvedValue(
      JSON.stringify({
        operations: [
          {
            action: "create",
            filepath: "identity/working-style.md",
            content: "---\ntitle: Working style\ntype: identity\n---\n\nPrefers focused mornings.",
          },
        ],
        index_updates: [{ slug: "working-style", summary: "Prefers focused mornings" }],
        log_entry: "Added working style.",
      })
    );

    const update = await ingestMemory({
      userId: "user-a",
      transcript: [{ role: "user", content: "I do my best work before noon." }],
      action: "memory.update",
      bootstrapIfEmpty: true,
    });

    expect(update.changes).toHaveLength(1);
    expect(mocks.callLLM).toHaveBeenCalledWith(expect.objectContaining({
      userId: "user-a",
      action: "memory.update",
    }));
    const written = mocks.writeMultipleVaultFilesForUser.mock.calls[0][1] as Array<{ path: string }>;
    expect(written.map((file) => file.path)).toEqual(
      expect.arrayContaining(["_index.md", "_log.md", "identity/working-style.md"])
    );
  });

  it("drops model-generated paths outside the Mora vault boundary", async () => {
    mocks.callLLM.mockResolvedValue(
      JSON.stringify({
        operations: [
          { action: "create", filepath: "../../secrets.md", content: "unsafe" },
          { action: "create", filepath: "goals/launch.md", content: "Ship the launch." },
        ],
        index_updates: [],
        log_entry: "Added a goal.",
      })
    );

    const update = await ingestMemory({
      userId: "user-a",
      transcript: [{ role: "user", content: "I want to ship the launch." }],
      action: "memory.update",
      bootstrapIfEmpty: true,
    });

    expect(update.changes.map((change) => change.filepath)).toEqual(["goals/launch.md"]);
    const written = mocks.writeMultipleVaultFilesForUser.mock.calls[0][1] as Array<{ path: string }>;
    expect(written.some((file) => file.path.includes(".."))).toBe(false);
  });
});
