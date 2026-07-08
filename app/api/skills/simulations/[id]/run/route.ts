import { getOrCreateUser } from "@/lib/get-or-create-user";
import {
  runSimulationForUser,
  SimulationServiceError,
} from "@/lib/skills/simulations/service";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  try {
    await runSimulationForUser(user, id);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof SimulationServiceError) {
      return Response.json(
        { error: error.message, ...error.details },
        { status: error.status }
      );
    }
    throw error;
  }
}
