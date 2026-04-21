import { after } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { loadSimulationContext } from "@/lib/skills/simulations/context-loader";
import { generateLenses } from "@/lib/pipelines/simulations/generate-lenses";
import { generateNarrative } from "@/lib/pipelines/simulations/generate-narrative";
import { requireCredits, CreditsExhaustedError } from "@/lib/credits";
import type {
  SimulationStatus,
  SimulationSummary,
} from "@/lib/skills/simulations/types";

// Rough minimum credit cost to start a new simulation (lens + narrative gen).
// The run step has a separate check. Keeps a user with 5 credits from
// starting a simulation they can't finish.
const MIN_CREDITS_START_SIM = 20;

/**
 * GET /api/skills/simulations
 *   → List the current user's simulations (most recent first).
 *
 * POST /api/skills/simulations
 *   → Create a new simulation. Kicks off lens + narrative generation
 *     fire-and-forget. Returns { id } immediately so the client can
 *     redirect to the dashboard and start polling.
 */

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sims = await prisma.simulation.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
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

  const simulations: SimulationSummary[] = sims.map((s) => ({
    id: s.id,
    title: s.title,
    scenario: s.scenario,
    timeHorizonYears: s.timeHorizonYears,
    status: s.status as SimulationStatus,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return Response.json({ simulations });
}

export async function POST(request: Request) {
  const user = await getOrCreateUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Gate: must have enough credits for lens + narrative generation.
  try {
    await requireCredits(user.id, MIN_CREDITS_START_SIM);
  } catch (err) {
    if (err instanceof CreditsExhaustedError) {
      return Response.json(
        {
          error: `Need at least ${MIN_CREDITS_START_SIM} credits to start a simulation.`,
          credits: err.credits,
          resetsAt: err.creditsResetAt.toISOString(),
        },
        { status: 402 }
      );
    }
    throw err;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const scenario = typeof b.scenario === "string" ? b.scenario.trim() : "";
  const narrative = typeof b.narrative === "string" ? b.narrative.trim() : "";
  const titleRaw = typeof b.title === "string" ? b.title.trim() : "";
  const years = Number(b.timeHorizonYears);

  if (!scenario) {
    return Response.json({ error: "Scenario is required" }, { status: 400 });
  }
  if (!Number.isFinite(years) || years < 1 || years > 50) {
    return Response.json(
      { error: "timeHorizonYears must be between 1 and 50" },
      { status: 400 }
    );
  }

  const title = titleRaw || scenario.slice(0, 80);

  const simulation = await prisma.simulation.create({
    data: {
      userId: user.id,
      title,
      scenario,
      narrative: narrative || null,
      timeHorizonYears: Math.round(years),
      status: "generating_lenses",
      lenses: [] as unknown as Prisma.InputJsonValue,
      runs: [] as unknown as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  // Run lens generation after the response is sent using next/server `after`.
  // This keeps the async work alive without blocking the response and avoids
  // unhandled-rejection panics from the old `void` fire-and-forget pattern.
  const simId = simulation.id;
  const userId = user.id;
  after(async () => {
    try {
      await kickoffLensGeneration(userId, simId);
    } catch (err) {
      console.error(`[simulations] lens generation failed for ${simId}:`, err);
      await prisma.simulation
        .update({
          where: { id: simId },
          data: { status: "failed", error: (err as Error).message },
        })
        .catch(() => {});
    }
  });

  return Response.json({ id: simulation.id }, { status: 201 });
}

/** Lens generation + optional narrative generation. Writes results to DB. */
async function kickoffLensGeneration(userId: string, simulationId: string): Promise<void> {
  const sim = await prisma.simulation.findUnique({
    where: { id: simulationId, userId },
  });
  if (!sim) throw new Error("Simulation not found for lens generation");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found for simulation");

  const vaultContext = await loadSimulationContext(
    user.vaultPath,
    sim.scenario,
    sim.narrative
  );

  const possibilities = await generateLenses({
    userName: user.name,
    vaultContext,
    scenario: sim.scenario,
    narrative: sim.narrative,
    timeHorizonYears: sim.timeHorizonYears,
    userId,
  });

  // If user didn't supply a narrative, generate one now.
  let narrative = sim.narrative;
  if (!narrative) {
    narrative = await generateNarrative({
      userName: user.name,
      vaultContext,
      scenario: sim.scenario,
      lenses: possibilities,
      timeHorizonYears: sim.timeHorizonYears,
      userId,
    });
  }

  await prisma.simulation.update({
    where: { id: simulationId },
    data: {
      lenses: possibilities as unknown as Prisma.InputJsonValue,
      narrative,
      status: "ready_to_run",
    },
  });
}
