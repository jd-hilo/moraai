import { getOrCreateUser } from "@/lib/get-or-create-user";
import {
  getSimulationForUser,
  SimulationServiceError,
} from "@/lib/skills/simulations/service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getOrCreateUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;

  try {
    return Response.json(await getSimulationForUser(user.id, id));
  } catch (error) {
    if (error instanceof SimulationServiceError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
