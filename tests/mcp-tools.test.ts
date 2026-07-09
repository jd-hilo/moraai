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
  createSimulationForUser: vi.fn(),
  runSimulationForUser: vi.fn(),
  simulateFutureForUser: vi.fn(),
  enrollFromClaudeMemory: vi.fn(),
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
  createSimulationForUser: mocks.createSimulationForUser,
  runSimulationForUser: mocks.runSimulationForUser,
  simulateFutureForUser: mocks.simulateFutureForUser,
}));
vi.mock("@/lib/mcp/enrollment", () => ({
  MAX_CLAUDE_MEMORY_SNAPSHOT_CHARS: 45_000,
  enrollFromClaudeMemory: mocks.enrollFromClaudeMemory,
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
    vi.clearAllMocks();
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
    mocks.createSimulationForUser.mockResolvedValue({
      id: "sim-new",
      status: "generating_lenses",
    });
    mocks.runSimulationForUser.mockResolvedValue({
      id: "sim-alpha",
      status: "running",
    });
    mocks.simulateFutureForUser.mockResolvedValue({
      id: "sim-complete",
      title: "Lisbon move",
      scenario: "Move to Lisbon",
      timeHorizonYears: 3,
      status: "complete",
      possibilities: [{ id: "likely", title: "Likely path" }],
      report: { verdict: "A considered move is likely to work." },
    });
    mocks.enrollFromClaudeMemory.mockResolvedValue({
      summary: "2 memory updates",
      changes: [{ summary: "Created identity/focus.md" }, { summary: "Created goals/launch.md" }],
    });
  });

  it("registers exactly the Claude-native beta tools with safe annotations", () => {
    const tools = registeredTools();
    expect([...tools.keys()]).toEqual([
      "get_mora_status",
      "enroll_from_claude_memory",
      "recall_twin",
      "save_memory",
      "list_simulations",
      "get_simulation",
      "create_simulation",
      "simulate_future",
      "run_simulation",
    ]);
    expect(tools.get("save_memory")?.config.annotations).toMatchObject({
      readOnlyHint: false,
      idempotentHint: true,
    });
    for (const name of ["get_mora_status", "recall_twin", "list_simulations", "get_simulation"]) {
      expect(tools.get(name)?.config.annotations).toMatchObject({ readOnlyHint: true });
    }
    expect(tools.get("enroll_from_claude_memory")?.config.annotations).toMatchObject({
      readOnlyHint: false,
      idempotentHint: true,
    });
    for (const name of ["create_simulation", "simulate_future", "run_simulation"]) {
      expect(tools.get(name)?.config.annotations).toMatchObject({
        readOnlyHint: false,
        idempotentHint: false,
      });
    }
  });

  it("enrolls an explicitly approved Claude snapshot without claiming hidden-memory access", async () => {
    const tools = registeredTools();
    const response = await tools.get("enroll_from_claude_memory")!.callback(
      { memorySnapshot: "The user works best in the morning and is planning a Lisbon move." } as never,
      { authInfo }
    );

    expect(mocks.enrollFromClaudeMemory).toHaveBeenCalledWith(
      "mora-alpha",
      "The user works best in the morning and is planning a Lisbon move."
    );
    expect(JSON.parse(response.content[0].text)).toMatchObject({
      status: "ok",
      memoriesCreatedOrUpdated: 2,
    });
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

  it("passes the OAuth-resolved Mora user into simulation mutations", async () => {
    const tools = registeredTools();
    await tools.get("create_simulation")!.callback(
      {
        scenario: "Move to Lisbon",
        narrative: "I would keep my current job.",
        title: "Lisbon move",
        timeHorizonYears: 3,
      } as never,
      { authInfo }
    );
    await tools.get("run_simulation")!.callback(
      { simulationId: "sim-alpha" } as never,
      { authInfo }
    );

    expect(mocks.createSimulationForUser).toHaveBeenCalledWith(
      { id: "mora-alpha", onboardingComplete: true },
      {
        scenario: "Move to Lisbon",
        narrative: "I would keep my current job.",
        title: "Lisbon move",
        timeHorizonYears: 3,
      }
    );
    expect(mocks.runSimulationForUser).toHaveBeenCalledWith(
      { id: "mora-alpha", onboardingComplete: true },
      "sim-alpha"
    );
  });

  it("runs a new simulation through to its report instead of returning a manual-run task", async () => {
    const tools = registeredTools();
    const response = await tools.get("simulate_future")!.callback(
      {
        scenario: "Move to Lisbon",
        narrative: "I would keep my current job.",
        title: "Lisbon move",
        timeHorizonYears: 3,
      } as never,
      { authInfo }
    );

    expect(mocks.simulateFutureForUser).toHaveBeenCalledWith(
      { id: "mora-alpha", onboardingComplete: true },
      {
        scenario: "Move to Lisbon",
        narrative: "I would keep my current job.",
        title: "Lisbon move",
        timeHorizonYears: 3,
      }
    );
    const payload = JSON.parse(response.content[0].text);
    expect(payload.status).toBe("ok");
    expect(payload.simulation.status).toBe("complete");
    expect(payload.simulation.report.verdict).toContain("likely to work");
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
