import { after } from "next/server";
import { Prisma, type User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCredits, CreditsExhaustedError } from "@/lib/credits";
import { generateLenses, UnclearScenarioError } from "@/lib/pipelines/simulations/generate-lenses";
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
export type SimulationProgressReporter = (progress: number, message: string) => Promise<void>;

const noSimulationProgress: SimulationProgressReporter = async () => undefined;

async function safelyReportProgress(
  reporter: SimulationProgressReporter,
  progress: number,
  message: string
): Promise<void> {
  await reporter(progress, message).catch(() => undefined);
}

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

// Words kept lowercase inside a Title Case title (unless first or last).
const TITLE_SMALL_WORDS = new Set([
  "a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "into",
  "nor", "of", "on", "onto", "or", "over", "the", "to", "vs", "via", "with",
]);

/** Normalize any raw title or scenario echo into a clean Title Case summary. */
export function normalizeSimulationTitle(raw: string): string {
  const words = raw.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const cased = words.map((word, index) => {
    if (/[A-Z]/.test(word.slice(1))) return word; // preserve acronyms like NYC, LA
    const lower = word.toLowerCase();
    const isEdge = index === 0 || index === words.length - 1;
    if (!isEdge && TITLE_SMALL_WORDS.has(lower)) return lower;
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  });
  return cased.join(" ").slice(0, 80).trim();
}

/**
 * Cheap pre-LLM signal check. Catches obviously empty or symbol/number-only
 * input; the lens-generation model performs the semantic gibberish check.
 */
function assertScenarioHasSignal(scenario: string): void {
  const alphaWords = scenario.split(/\s+/).filter((word) => /[a-zA-Z]{2,}/.test(word));
  if (scenario.length < 8 || alphaWords.length < 2) {
    throw new SimulationServiceError(
      "UNCLEAR_SCENARIO",
      422,
      "Mora couldn't find a concrete decision in that scenario. Describe it as a specific what-if, e.g. \"What if I move to Austin next year?\""
    );
  }
}

function normalizeCreateInput(input: CreateSimulationInput) {
  const scenario = input.scenario.trim();
  const narrative = input.narrative?.trim() ?? "";
  const years = Math.round(input.timeHorizonYears);

  if (!scenario) {
    throw new SimulationServiceError("INVALID_INPUT", 400, "Scenario is required.");
  }
  assertScenarioHasSignal(scenario);
  const title = normalizeSimulationTitle(input.title?.trim() || scenario.slice(0, 80));
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

/**
 * Return recent completed simulations as user-safe DTOs for server-side
 * personalized context assembly. Ownership is enforced in the query rather
 * than by filtering a broader result in application code.
 */
export async function listCompletedSimulationsForUser(
  userId: string,
  take = 20
): Promise<SimulationDetail[]> {
  const simulations = await prisma.simulation.findMany({
    where: { userId, status: "complete" },
    orderBy: { updatedAt: "desc" },
    take,
  });
  return simulations.map((simulation) => toDetail(simulation));
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
      const message =
        error instanceof UnclearScenarioError
          ? `Mora needs a clearer scenario before simulating. ${error.question}`
          : (error as Error).message;
      await prisma.simulation
        .update({
          where: { id: simulation.id },
          data: { status: "failed", error: message },
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
  input: CreateSimulationInput,
  reportProgress: SimulationProgressReporter = noSimulationProgress
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
  await safelyReportProgress(
    reportProgress,
    5,
    "Simulation created. Preparing ten possible paths."
  );

  try {
    await generateSimulationPossibilities(user, simulation.id);
    await safelyReportProgress(reportProgress, 25, "Ten possible paths are ready.");
  } catch (error) {
    if (error instanceof UnclearScenarioError) {
      // Don't leave a junk row behind for input Mora refused to fabricate from.
      await prisma.simulation.delete({ where: { id: simulation.id } }).catch(() => undefined);
      throw new SimulationServiceError("UNCLEAR_SCENARIO", 422, error.question);
    }
    await markSimulationFailed(simulation.id, error);
    throw error;
  }

  try {
    await beginSimulationRun(user, simulation.id);
    await safelyReportProgress(reportProgress, 30, "Running all ten paths in parallel.");
  } catch (error) {
    // A credit or state error leaves a generated simulation available to run
    // later; it is not a failed simulation.
    throw error;
  }

  try {
    await executeSimulation(user, simulation.id, reportProgress);
  } catch (error) {
    await markSimulationFailed(simulation.id, error);
    throw error;
  }

  const completed = await getSimulationForUser(user.id, simulation.id);
  if (completed.status !== "complete" || !completed.report) {
    throw new SimulationServiceError(
      "SIMULATION_FAILED",
      500,
      "Simulation could not produce a completed report.",
      { simulationId: simulation.id }
    );
  }
  await safelyReportProgress(reportProgress, 100, "Simulation complete.");
  return completed;
}

/**
 * Permanently delete a simulation the user owns. Blocked while background
 * stages are still writing to the row so a job can't resurrect or crash on it.
 */
export async function deleteSimulationForUser(
  userId: string,
  simulationId: string
): Promise<{ id: string }> {
  const simulation = await findOwnedSimulation(userId, simulationId);
  if (!simulation) throw new SimulationServiceError("NOT_FOUND", 404, "Simulation not found.");
  const busyStatuses: SimulationStatus[] = ["generating_lenses", "running", "generating_report"];
  if (busyStatuses.includes(simulation.status as SimulationStatus)) {
    throw new SimulationServiceError(
      "INVALID_STATE",
      409,
      `Simulation cannot be deleted while its status is ${simulation.status}.`
    );
  }
  await prisma.simulation.delete({ where: { id: simulation.id } });
  return { id: simulation.id };
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

async function executeSimulation(
  user: User,
  simulationId: string,
  reportProgress: SimulationProgressReporter = noSimulationProgress
): Promise<void> {
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

  let finishedRunCount = 0;
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
      } finally {
        finishedRunCount += 1;
        const runProgress =
          30 + Math.round((finishedRunCount / possibilities.length) * 50);
        await safelyReportProgress(
          reportProgress,
          runProgress,
          `Finished ${finishedRunCount} of ${possibilities.length} paths.`
        );
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

  await safelyReportProgress(reportProgress, 85, "Synthesizing the completed paths.");
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
  await safelyReportProgress(reportProgress, 95, "Simulation saved. Preparing the response.");
}
