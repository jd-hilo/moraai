import { after } from "next/server";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCredits, CreditsExhaustedError } from "@/lib/credits";
import { generateLenses } from "@/lib/pipelines/simulations/generate-lenses";
import { generateNarrative } from "@/lib/pipelines/simulations/generate-narrative";
import { generateReport } from "@/lib/pipelines/simulations/generate-report";
import { runLensSimulation } from "@/lib/pipelines/simulations/run-lens-simulation";
import { loadSimulationContext } from "@/lib/skills/simulations/context-loader";
import type {
  Possibility,
  PossibilityRun,
  SimulationDetail,
  SimulationReport,
  SimulationStatus,
  SimulationSummary,
} from "@/lib/skills/simulations/types";

export const MIN_CREDITS_START_SIMULATION = 20;
export const MIN_CREDITS_RUN_SIMULATION = 40;

type Scheduler = (work: () => Promise<void>) => void;
const scheduleAfterResponse: Scheduler = (work) => after(work);

export class SimulationServiceError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SimulationServiceError";
  }
}

export interface CreateSimulationInput {
  scenario: string;
  narrative?: string;
  title?: string;
  timeHorizonYears: number;
}

function normalizeCreateInput(input: CreateSimulationInput) {
  const scenario = input.scenario.trim();
  const narrative = input.narrative?.trim() ?? "";
  const title = input.title?.trim() || scenario.slice(0, 80);
  const years = Math.round(input.timeHorizonYears);

  if (!scenario) {
    throw new SimulationServiceError("INVALID_INPUT", 400, "Scenario is required.");
  }
  if (!Number.isFinite(years) || years < 1 || years > 50) {
    throw new SimulationServiceError(
      "INVALID_INPUT",
      400,
      "timeHorizonYears must be between 1 and 50."
    );
  }

  return { scenario, narrative, title, years };
}

function creditError(error: CreditsExhaustedError, needed: number): SimulationServiceError {
  return new SimulationServiceError(
    "INSUFFICIENT_CREDITS",
    402,
    `Need at least ${needed} credits for this simulation step.`,
    {
      credits: error.credits,
      needed,
      resetsAt: error.creditsResetAt.toISOString(),
    }
  );
}

function toDetail(simulation: Awaited<ReturnType<typeof findOwnedSimulation>>): SimulationDetail {
  if (!simulation) throw new SimulationServiceError("NOT_FOUND", 404, "Simulation not found.");
  return {
    id: simulation.id,
    title: simulation.title,
    scenario: simulation.scenario,
    narrative: simulation.narrative,
    timeHorizonYears: simulation.timeHorizonYears,
    status: simulation.status as SimulationStatus,
    possibilities: (simulation.lenses as unknown as Possibility[]) ?? [],
    runs: (simulation.runs as unknown as PossibilityRun[]) ?? [],
    report: (simulation.report as unknown as SimulationReport | null) ?? null,
    error: simulation.error,
    createdAt: simulation.createdAt.toISOString(),
    updatedAt: simulation.updatedAt.toISOString(),
  };
}

async function findOwnedSimulation(userId: string, simulationId: string) {
  return prisma.simulation.findUnique({ where: { id: simulationId, userId } });
}

export async function listSimulationsForUser(userId: string): Promise<SimulationSummary[]> {
  const simulations = await prisma.simulation.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 25,
    select: {
      id: true,
      title: true,
      scenario: true,
      timeHorizonYears: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return simulations.map((simulation) => ({
    ...simulation,
    status: simulation.status as SimulationStatus,
    createdAt: simulation.createdAt.toISOString(),
    updatedAt: simulation.updatedAt.toISOString(),
  }));
}

export async function getSimulationForUser(
  userId: string,
  simulationId: string
): Promise<SimulationDetail> {
  return toDetail(await findOwnedSimulation(userId, simulationId));
}

export async function createSimulationForUser(
  user: User,
  input: CreateSimulationInput,
  schedule: Scheduler = scheduleAfterResponse
): Promise<{ id: string; status: SimulationStatus }> {
  const { scenario, narrative, title, years } = normalizeCreateInput(input);

  try {
    await requireCredits(user.id, MIN_CREDITS_START_SIMULATION);
  } catch (error) {
    if (error instanceof CreditsExhaustedError) {
      throw creditError(error, MIN_CREDITS_START_SIMULATION);
    }
    throw error;
  }

  const simulation = await prisma.simulation.create({
    data: {
      userId: user.id,
      title,
      scenario,
      narrative: narrative || null,
      timeHorizonYears: years,
      status: "generating_lenses",
      lenses: [] as unknown as Prisma.InputJsonValue,
      runs: [] as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  schedule(async () => {
    try {
      await generateSimulationPossibilities(user, simulation.id);
    } catch (error) {
      console.error(`[simulations] lens generation failed for ${simulation.id}:`, error);
      await prisma.simulation
        .update({
          where: { id: simulation.id },
          data: { status: "failed", error: (error as Error).message },
        })
        .catch(() => undefined);
    }
  });

  return { id: simulation.id, status: "generating_lenses" };
}

/**
 * Runs every stage before returning. This is intentionally separate from the
 * web-app's asynchronous draft flow so an MCP client can answer a user's
 * request for a simulation with the completed report in the same turn.
 */
export async function simulateFutureForUser(
  user: User,
  input: CreateSimulationInput
): Promise<SimulationDetail> {
  const { scenario, narrative, title, years } = normalizeCreateInput(input);

  try {
    await requireCredits(user.id, MIN_CREDITS_START_SIMULATION);
  } catch (error) {
    if (error instanceof CreditsExhaustedError) {
      throw creditError(error, MIN_CREDITS_START_SIMULATION);
    }
    throw error;
  }

  const simulation = await prisma.simulation.create({
    data: {
      userId: user.id,
      title,
      scenario,
      narrative: narrative || null,
      timeHorizonYears: years,
      status: "generating_lenses",
      lenses: [] as unknown as Prisma.InputJsonValue,
      runs: [] as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  try {
    await generateSimulationPossibilities(user, simulation.id);
  } catch (error) {
    await markSimulationFailed(simulation.id, error);
    throw error;
  }

  try {
    await beginSimulationRun(user, simulation.id);
  } catch (error) {
    // A credit or state error leaves a generated simulation available to run
    // later; it is not a failed simulation.
    throw error;
  }

  try {
    await executeSimulation(user, simulation.id);
  } catch (error) {
    await markSimulationFailed(simulation.id, error);
    throw error;
  }

  return getSimulationForUser(user.id, simulation.id);
}

export async function runSimulationForUser(
  user: User,
  simulationId: string,
  schedule: Scheduler = scheduleAfterResponse
): Promise<{ id: string; status: SimulationStatus }> {
  await beginSimulationRun(user, simulationId);

  schedule(async () => {
    try {
      await executeSimulation(user, simulationId);
    } catch (error) {
      console.error(`[simulations] run failed for ${simulationId}:`, error);
      await markSimulationFailed(simulationId, error);
    }
  });

  return { id: simulationId, status: "running" };
}

async function beginSimulationRun(user: User, simulationId: string): Promise<void> {
  const simulation = await findOwnedSimulation(user.id, simulationId);
  if (!simulation) throw new SimulationServiceError("NOT_FOUND", 404, "Simulation not found.");
  if (simulation.status !== "ready_to_run" && simulation.status !== "failed") {
    throw new SimulationServiceError(
      "INVALID_STATE",
      409,
      `Simulation cannot run while its status is ${simulation.status}.`
    );
  }

  const possibilities = (simulation.lenses as unknown as Possibility[]) ?? [];
  if (possibilities.length === 0) {
    throw new SimulationServiceError("INVALID_STATE", 409, "Simulation has no possibilities to run.");
  }

  try {
    await requireCredits(user.id, MIN_CREDITS_RUN_SIMULATION);
  } catch (error) {
    if (error instanceof CreditsExhaustedError) {
      throw creditError(error, MIN_CREDITS_RUN_SIMULATION);
    }
    throw error;
  }

  const runs: PossibilityRun[] = possibilities.map((possibility) => ({
    possibilityId: possibility.id,
    status: "pending",
    output: "",
  }));
  await prisma.simulation.update({
    where: { id: simulation.id },
    data: {
      status: "running",
      runs: runs as unknown as Prisma.InputJsonValue,
      error: null,
    },
  });
}

async function markSimulationFailed(simulationId: string, error: unknown): Promise<void> {
  await prisma.simulation
    .update({
      where: { id: simulationId },
      data: { status: "failed", error: (error as Error).message },
    })
    .catch(() => undefined);
}

async function generateSimulationPossibilities(user: User, simulationId: string): Promise<void> {
  const simulation = await findOwnedSimulation(user.id, simulationId);
  if (!simulation) throw new Error("Simulation not found for possibility generation.");

  const vaultContext = await loadSimulationContext(
    user.vaultPath,
    simulation.scenario,
    simulation.narrative
  );
  const possibilities = await generateLenses({
    userName: user.name,
    vaultContext,
    scenario: simulation.scenario,
    narrative: simulation.narrative,
    timeHorizonYears: simulation.timeHorizonYears,
    userId: user.id,
  });
  const narrative =
    simulation.narrative ||
    (await generateNarrative({
      userName: user.name,
      vaultContext,
      scenario: simulation.scenario,
      lenses: possibilities,
      timeHorizonYears: simulation.timeHorizonYears,
      userId: user.id,
    }));

  await prisma.simulation.update({
    where: { id: simulation.id },
    data: {
      lenses: possibilities as unknown as Prisma.InputJsonValue,
      narrative,
      status: "ready_to_run",
    },
  });
}

async function executeSimulation(user: User, simulationId: string): Promise<void> {
  const simulation = await findOwnedSimulation(user.id, simulationId);
  if (!simulation) throw new Error("Simulation not found for execution.");

  const possibilities = (simulation.lenses as unknown as Possibility[]) ?? [];
  const vaultContext = await loadSimulationContext(
    user.vaultPath,
    simulation.scenario,
    simulation.narrative
  );
  const narrative = simulation.narrative ?? "";

  const runningAt = new Date().toISOString();
  const runningRuns: PossibilityRun[] = possibilities.map((possibility) => ({
    possibilityId: possibility.id,
    status: "running",
    output: "",
    startedAt: runningAt,
  }));
  await prisma.simulation.update({
    where: { id: simulation.id },
    data: { runs: runningRuns as unknown as Prisma.InputJsonValue },
  });

  const completedRuns = await Promise.all(
    possibilities.map(async (possibility) => {
      try {
        const result = await runLensSimulation({
          userName: user.name,
          vaultContext,
          scenario: simulation.scenario,
          narrative,
          lens: possibility,
          timeHorizonYears: simulation.timeHorizonYears,
          userId: user.id,
        });
        return {
          possibilityId: possibility.id,
          status: "complete",
          output: result.output,
          confidence: result.confidence,
          startedAt: runningAt,
          completedAt: new Date().toISOString(),
        } satisfies PossibilityRun;
      } catch (error) {
        return {
          possibilityId: possibility.id,
          status: "failed",
          output: "",
          error: (error as Error).message,
          startedAt: runningAt,
          completedAt: new Date().toISOString(),
        } satisfies PossibilityRun;
      }
    })
  );

  await prisma.simulation.update({
    where: { id: simulation.id },
    data: {
      status: "generating_report",
      runs: completedRuns as unknown as Prisma.InputJsonValue,
    },
  });
  const fresh = await findOwnedSimulation(user.id, simulation.id);
  if (!fresh) throw new Error("Simulation disappeared before report generation.");

  if (!completedRuns.some((run) => run.status === "complete")) {
    await prisma.simulation.update({
      where: { id: simulation.id },
      data: { status: "failed", error: "All possibility runs failed." },
    });
    return;
  }

  const report = await generateReport({
    userName: user.name,
    vaultContext,
    scenario: fresh.scenario,
    narrative: fresh.narrative ?? "",
    lenses: possibilities,
    runs: completedRuns,
    timeHorizonYears: fresh.timeHorizonYears,
    userId: user.id,
  });
  await prisma.simulation.update({
    where: { id: simulation.id },
    data: {
      status: "complete",
      report: report as unknown as Prisma.InputJsonValue,
    },
  });
}
