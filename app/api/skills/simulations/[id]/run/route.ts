import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import { loadSimulationContext } from "@/lib/skills/simulations/context-loader";
import { runLensSimulation } from "@/lib/pipelines/simulations/run-lens-simulation";
import { generateReport } from "@/lib/pipelines/simulations/generate-report";
import type { Possibility, PossibilityRun } from "@/lib/skills/simulations/types";

/**
 * POST /api/skills/simulations/[id]/run
 *   → Kick off the parallel lens runs and final report synthesis.
 *     Returns immediately; client polls GET /api/skills/simulations/[id]
 *     to see progress (each lens run writes its result back to the DB as
 *     it completes, so the client sees cards fill in one by one).
 */
export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  const user = await getOrCreateUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const sim = await prisma.simulation.findUnique({
    where: { id, userId: user.id },
  });
  if (!sim) return Response.json({ error: "Not found" }, { status: 404 });

  if (sim.status !== "ready_to_run" && sim.status !== "failed") {
    return Response.json(
      { error: `Cannot run simulation in status "${sim.status}"` },
      { status: 409 }
    );
  }

  const lenses = (sim.lenses as unknown as Possibility[]) ?? [];
  if (lenses.length === 0) {
    return Response.json({ error: "No possibilities to run" }, { status: 400 });
  }

  // Initialize runs array: one entry per possibility, all pending.
  const initialRuns: PossibilityRun[] = lenses.map((p) => ({
    possibilityId: p.id,
    status: "pending",
    output: "",
  }));

  await prisma.simulation.update({
    where: { id },
    data: {
      status: "running",
      runs: initialRuns as unknown as Prisma.InputJsonValue,
      error: null,
    },
  });

  // Fire-and-forget: parallel lens runs + final report.
  void executeSimulation(user.id, id).catch((err) => {
    console.error(`[simulations] run failed for ${id}:`, err);
    prisma.simulation
      .update({
        where: { id },
        data: { status: "failed", error: (err as Error).message },
      })
      .catch(() => {});
  });

  return Response.json({ ok: true });
}

/**
 * Run all N lenses in parallel, writing each result to DB as it completes,
 * then generate the final report.
 */
async function executeSimulation(userId: string, simulationId: string): Promise<void> {
  const sim = await prisma.simulation.findUnique({
    where: { id: simulationId, userId },
  });
  if (!sim) throw new Error("Simulation not found for execution");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found for simulation");

  const possibilities = (sim.lenses as unknown as Possibility[]) ?? [];
  const vaultContext = await loadSimulationContext(
    user.vaultPath,
    sim.scenario,
    sim.narrative
  );
  const narrative = sim.narrative ?? "";

  // Launch all possibility runs in parallel. Each writes its result back to
  // DB as it completes so the polling client sees cards fill in one by one.
  const runPromises = possibilities.map(async (possibility) => {
    const startedAt = new Date().toISOString();
    await patchRun(simulationId, possibility.id, { status: "running", startedAt });

    try {
      const result = await runLensSimulation({
        userName: user.name,
        vaultContext,
        scenario: sim.scenario,
        narrative,
        lens: possibility,
        timeHorizonYears: sim.timeHorizonYears,
      });
      await patchRun(simulationId, possibility.id, {
        status: "complete",
        output: result.output,
        confidence: result.confidence,
        completedAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error(`[simulations] possibility "${possibility.id}" failed:`, err);
      await patchRun(simulationId, possibility.id, {
        status: "failed",
        error: (err as Error).message,
        completedAt: new Date().toISOString(),
      });
    }
  });

  await Promise.all(runPromises);

  // All runs done (complete or failed) — synthesize report.
  await prisma.simulation.update({
    where: { id: simulationId },
    data: { status: "generating_report" },
  });

  const freshSim = await prisma.simulation.findUnique({ where: { id: simulationId } });
  if (!freshSim) throw new Error("Simulation vanished between run and report");

  const runs = (freshSim.runs as unknown as PossibilityRun[]) ?? [];

  // Guard: if every run failed, mark failed and bail.
  const anyComplete = runs.some((r) => r.status === "complete");
  if (!anyComplete) {
    await prisma.simulation.update({
      where: { id: simulationId },
      data: { status: "failed", error: "All possibility runs failed" },
    });
    return;
  }

  const report = await generateReport({
    userName: user.name,
    vaultContext,
    scenario: freshSim.scenario,
    narrative: freshSim.narrative ?? "",
    lenses: possibilities,
    runs,
    timeHorizonYears: freshSim.timeHorizonYears,
  });

  await prisma.simulation.update({
    where: { id: simulationId },
    data: {
      status: "complete",
      report: report as unknown as Prisma.InputJsonValue,
    },
  });
}

/**
 * Atomically patch a single LensRun inside the Simulation's runs JSON array.
 * Reads, mutates, writes. Fine for our scale — single-user, single-writer.
 */
async function patchRun(
  simulationId: string,
  possibilityId: string,
  patch: Partial<PossibilityRun>
): Promise<void> {
  const sim = await prisma.simulation.findUnique({
    where: { id: simulationId },
    select: { runs: true },
  });
  if (!sim) return;

  const runs = (sim.runs as unknown as PossibilityRun[]) ?? [];
  const updated = runs.map((r) =>
    r.possibilityId === possibilityId ? { ...r, ...patch } : r
  );

  await prisma.simulation.update({
    where: { id: simulationId },
    data: { runs: updated as unknown as Prisma.InputJsonValue },
  });
}
