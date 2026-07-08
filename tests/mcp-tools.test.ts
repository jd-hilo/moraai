import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const mocks = vi.hoisted(() => ({
  getOrCreateUserByClerkId: vi.fn(),
  listVaultFilesForUser: vi.fn(),
  recallMemoryForUser: vi.fn(),
  saveMemoryForUser: vi.fn(),
  listSimulationsForUser: vi.fn(),
  getSimulationForUser: vi.fn(),
}));

vi.mock("@/lib/get-or-create-user", () => ({
  getOrCreateUserByClerkId: mocks.getOrCreateUserByClerkId,
  MoraIdentityConflictError: class MoraIdentityConflictError extends Error {
    readonly code = "ACCOUNT_IDENTITY_CONFLICT";
  },
}));
vi.mock("@/lib/vault/storage", () => ({
  listVaultFilesForUser: mocks.listVaultFilesForUser,
}));
vi.mock("@/lib/mcp/memory", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/mcp/memory")>()),
  recallMemoryForUser: mocks.recallMemoryForUser,
  saveMemoryForUser: mocks.saveMemoryForUser,
}));
vi.mock("@/lib/skills/simulations/service", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/skills/simulations/service")>()),
  listSimulationsForUser: mocks.listSimulationsForUser,
  getSimulationForUser: mocks.getSimulationForUser,
}));

import { registerMoraTools } from "@/lib/mcp/tools";

interface RegisteredTool {
  config: { annotations?: Record<string, boolean> };
  callback: (input: never, context: { authInfo: AuthInfo }) => Promise<{
    isError?: boolean;
    content: Array<{ text: string }>;
  }>;
}

function registeredTools(): Map<string, RegisteredTool> {
  const tools = new Map<string, RegisteredTool>();
  const server = {
    registerTool: (name: string, config: RegisteredTool["config"], callback: RegisteredTool["callback"]) => {
      tools.set(name, { config, callback });
    },
  };
  registerMoraTools(server as unknown as McpServer);
  return tools;
}

const authInfo = { extra: { userId: "clerk-alpha" } } as unknown as AuthInfo;

describe("MCP tool surface", () => {
  beforeEach(() => {
    mocks.getOrCreateUserByClerkId.mockResolvedValue({
      id: "mora-alpha",
      onboardingComplete: true,
    });
    mocks.listVaultFilesForUser.mockResolvedValue(["identity/focus.md"]);
    mocks.recallMemoryForUser.mockResolvedValue({
      kind: "ready",
      memory: "<memory_record>Alpha focus</memory_record>",
      recordsUsed: 1,
    });
    mocks.saveMemoryForUser.mockResolvedValue({
      outcome: "created",
      category: "identity",
      subject: "Focus",
      summary: "Created Mora memory for Focus.",
    });
    mocks.listSimulationsForUser.mockResolvedValue([]);
    mocks.getSimulationForUser.mockResolvedValue({
      id: "sim-alpha",
      status: "failed",
      error: "Provider secret or stack trace",
    });
  });

  it("registers exactly the five Claude-native beta tools with safe annotations", () => {
    const tools = registeredTools();
    expect([...tools.keys()]).toEqual([
      "get_mora_status",
      "recall_twin",
      "save_memory",
      "list_simulations",
      "get_simulation",
    ]);
    expect(tools.get("save_memory")?.config.annotations).toMatchObject({
      readOnlyHint: false,
      idempotentHint: true,
    });
    for (const name of ["get_mora_status", "recall_twin", "list_simulations", "get_simulation"]) {
      expect(tools.get(name)?.config.annotations).toMatchObject({ readOnlyHint: true });
    }
  });

  it("passes only the OAuth-resolved internal Mora user ID into recall and save", async () => {
    const tools = registeredTools();
    await tools.get("recall_twin")!.callback({ query: "focus" } as never, { authInfo });
    await tools.get("save_memory")!.callback(
      {
        category: "identity",
        subject: "Focus",
        memory: "I focus in the morning.",
      } as never,
      { authInfo }
    );
    expect(mocks.getOrCreateUserByClerkId).toHaveBeenCalledWith("clerk-alpha");
    expect(mocks.recallMemoryForUser).toHaveBeenCalledWith("mora-alpha", "focus");
    expect(mocks.saveMemoryForUser).toHaveBeenCalledWith("mora-alpha", {
      category: "identity",
      subject: "Focus",
      memory: "I focus in the morning.",
      context: undefined,
    });
  });

  it("returns onboarding and no-match states without leaking internal details", async () => {
    const tools = registeredTools();
    mocks.recallMemoryForUser.mockResolvedValueOnce({ kind: "empty", memory: "", recordsUsed: 0 });
    const empty = await tools.get("recall_twin")!.callback({ query: "focus" } as never, { authInfo });
    mocks.recallMemoryForUser.mockResolvedValueOnce({ kind: "no_match", memory: "", recordsUsed: 0 });
    const noMatch = await tools.get("recall_twin")!.callback({ query: "travel" } as never, { authInfo });

    expect(JSON.parse(empty.content[0].text)).toMatchObject({
      status: "setup_required",
      errorCode: "MEMORY_NOT_READY",
    });
    expect(JSON.parse(noMatch.content[0].text)).toMatchObject({
      status: "no_match",
      errorCode: "NO_RELEVANT_MEMORY",
    });
  });

  it("redacts stored simulation failure details", async () => {
    const tools = registeredTools();
    const response = await tools.get("get_simulation")!.callback(
      { simulationId: "sim-alpha" } as never,
      { authInfo }
    );
    const payload = JSON.parse(response.content[0].text);
    expect(payload.status).toBe("error");
    expect(response.isError).toBe(true);
    expect(payload.simulation.error).toBe("Simulation failed.");
    expect(response.content[0].text).not.toContain("Provider secret");
    expect(mocks.getSimulationForUser).toHaveBeenCalledWith("mora-alpha", "sim-alpha");
  });
});
