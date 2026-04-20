import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/get-or-create-user";
import type {
  Possibility,
  PossibilityRun,
  SimulationDetail,
  SimulationReport,
  SimulationStatus,
} from "@/lib/skills/simulations/types";

/**
 * GET /api/skills/simulations/[id]
 *   → Return the full Simulation detail. Client polls this to drive the
 *     dashboard state machine.
 */
export async function GET(
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

  const detail: SimulationDetail = {
    id: sim.id,
    title: sim.title,
    scenario: sim.scenario,
    narrative: sim.narrative,
    timeHorizonYears: sim.timeHorizonYears,
    status: sim.status as SimulationStatus,
    possibilities: (sim.lenses as unknown as Possibility[]) ?? [],
    runs: (sim.runs as unknown as PossibilityRun[]) ?? [],
    report: (sim.report as unknown as SimulationReport | null) ?? null,
    error: sim.error,
    createdAt: sim.createdAt.toISOString(),
    updatedAt: sim.updatedAt.toISOString(),
  };

  return Response.json(detail);
}
