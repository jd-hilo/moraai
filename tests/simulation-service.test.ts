import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  class FakeCreditsExhaustedError extends Error {
    constructor(
      public credits: number,
      public creditsResetAt: Date,
      public needed: number
    ) {
      super("Out of credits");
    }
  }
  return {
    prisma: {
      simulation: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
    requireCredits: vi.fn(),
    loadSimulationContext: vi.fn(),
    generateLenses: vi.fn(),
    generateNarrative: vi.fn(),
    runLensSimulation: vi.fn(),
    generateReport: vi.fn(),
    FakeCreditsExhaustedError,
  };
});

vi.mock("next/server", () => ({ after: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/credits", () => ({
  requireCredits: mocks.requireCredits,
  CreditsExhaustedError: mocks.FakeCreditsExhaustedError,
}));
vi.mock("@/lib/skills/simulations/context-loader", () => ({
  loadSimulationContext: mocks.loadSimulationContext,
}));
vi.mock("@/lib/pipelines/simulations/generate-lenses", () => ({
  generateLenses: mocks.generateLenses,
}));
vi.mock("@/lib/pipelines/simulations/generate-narrative", () => ({
  generateNarrative: mocks.generateNarrative,
}));
vi.mock("@/lib/pipelines/simulations/generate-report", () => ({
  generateReport: mocks.generateReport,
}));
vi.mock("@/lib/pipelines/simulations/run-lens-simulation", () => ({
  runLensSimulation: mocks.runLensSimulation,
}));

import {
  createSimulationForUser,
  getSimulationForUser,
  listSimulationsForUser,
  runSimulationForUser,
  simulateFutureForUser,
  SimulationServiceError,
} from "@/lib/skills/simulations/service";

function simulation(userId: string) {
  return {
    id: `sim-${userId}`,
    userId,
    title: `${userId} future`,
    scenario: `${userId} scenario`,
    narrative: null,
    timeHorizonYears: 3,
    status: "complete",
    lenses: [],
    runs: [],
    report: { verdict: userId },
    error: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
  };
}

describe("simulation service", () => {
  beforeEach(() => {
    mocks.requireCredits.mockResolvedValue({ credits: 500 });
    mocks.loadSimulationContext.mockResolvedValue("context");
    mocks.generateReport.mockResolvedValue({ summary: "report" });
    mocks.generateLenses.mockResolvedValue([{ id: "one" }, { id: "two" }]);
    mocks.runLensSimulation.mockImplementation(async ({ lens }: { lens: { id: string } }) => ({
      output: `output-${lens.id}`,
      confidence: 0.8,
    }));
  });

  it("keeps parallel users scoped to their own simulation rows", async () => {
    mocks.prisma.simulation.findUnique.mockImplementation(
      async ({ where }: { where: { id: string; userId: string } }) => simulation(where.userId)
    );

    const [alpha, beta] = await Promise.all([
      getSimulationForUser("alpha", "sim-alpha"),
      getSimulationForUser("beta", "sim-beta"),
    ]);

    expect(alpha.report?.verdict).toBe("alpha");
    expect(beta.report?.verdict).toBe("beta");
    expect(mocks.prisma.simulation.findUnique).toHaveBeenCalledWith({
      where: { id: "sim-alpha", userId: "alpha" },
    });
    expect(mocks.prisma.simulation.findUnique).toHaveBeenCalledWith({
      where: { id: "sim-beta", userId: "beta" },
    });
  });

  it("keeps parallel simulation lists scoped to each internal user", async () => {
    mocks.prisma.simulation.findMany.mockImplementation(
      async ({ where }: { where: { userId: string } }) => [simulation(where.userId)]
    );
    const [alpha, beta] = await Promise.all([
      listSimulationsForUser("alpha"),
      listSimulationsForUser("beta"),
    ]);
    expect(alpha[0].scenario).toContain("alpha");
    expect(beta[0].scenario).toContain("beta");
    expect(mocks.prisma.simulation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "alpha" } })
    );
    expect(mocks.prisma.simulation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "beta" } })
    );
  });

  it("rejects an invalid time horizon before creating data", async () => {
    await expect(
      createSimulationForUser(
        { id: "alpha" } as never,
        { scenario: "Move cities", timeHorizonYears: 51 },
        vi.fn()
      )
    ).rejects.toMatchObject({ code: "INVALID_INPUT", status: 400 });
    expect(mocks.prisma.simulation.create).not.toHaveBeenCalled();
  });

  it("returns a stable credit error before starting paid work", async () => {
    mocks.requireCredits.mockRejectedValue(
      new mocks.FakeCreditsExhaustedError(4, new Date("2026-02-01T00:00:00.000Z"), 20)
    );

    await expect(
      createSimulationForUser(
        { id: "alpha" } as never,
        { scenario: "Move cities", timeHorizonYears: 3 },
        vi.fn()
      )
    ).rejects.toBeInstanceOf(SimulationServiceError);
  });

  it("checks simulation ownership and state before checking credits", async () => {
    mocks.prisma.simulation.findUnique.mockResolvedValueOnce(null);

    await expect(
      runSimulationForUser({ id: "alpha" } as never, "sim-other", vi.fn())
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mocks.requireCredits).not.toHaveBeenCalled();
  });

  it("keeps parallel lens results together in one persisted runs update", async () => {
    const ready = {
      ...simulation("alpha"),
      status: "ready_to_run",
      lenses: [{ id: "one" }, { id: "two" }],
      runs: [],
    };
    mocks.prisma.simulation.findUnique.mockResolvedValue(ready);
    mocks.prisma.simulation.update.mockResolvedValue(ready);
    let scheduled: (() => Promise<void>) | undefined;
    const schedule = vi.fn((work: () => Promise<void>) => {
      scheduled = work;
    });

    await runSimulationForUser({ id: "alpha", vaultPath: "vaults/alpha/" } as never, ready.id, schedule);
    await scheduled?.();

    const runsUpdates = mocks.prisma.simulation.update.mock.calls
      .map(([call]) => call.data.runs)
      .filter(Boolean);
    const completed = runsUpdates.find((runs) =>
      Array.isArray(runs) && runs.every((run) => run.status === "complete")
    );

    expect(completed).toEqual([
      expect.objectContaining({ possibilityId: "one", output: "output-one" }),
      expect.objectContaining({ possibilityId: "two", output: "output-two" }),
    ]);
  });

  it("runs a Claude-requested simulation from creation through its completed report", async () => {
    let stored = {
      ...simulation("alpha"),
      id: "sim-full",
      status: "generating_lenses",
      lenses: [],
      runs: [],
      report: null,
      narrative: "Keep the current job.",
    };
    mocks.prisma.simulation.create.mockImplementation(async ({ data }) => {
      stored = { ...stored, ...data };
      return { id: stored.id };
    });
    mocks.prisma.simulation.findUnique.mockImplementation(async () => stored);
    mocks.prisma.simulation.update.mockImplementation(async ({ data }) => {
      stored = { ...stored, ...data };
      return stored;
    });

    const completed = await simulateFutureForUser(
      { id: "alpha", name: "Alpha", vaultPath: "vaults/alpha/" } as never,
      {
        scenario: "Move to Lisbon",
        narrative: "Keep the current job.",
        timeHorizonYears: 3,
      }
    );

    expect(mocks.requireCredits).toHaveBeenCalledTimes(2);
    expect(completed.status).toBe("complete");
    expect(completed.report).toEqual({ summary: "report" });
    expect(completed.runs).toEqual([
      expect.objectContaining({ possibilityId: "one", status: "complete" }),
      expect.objectContaining({ possibilityId: "two", status: "complete" }),
    ]);
  });
});
