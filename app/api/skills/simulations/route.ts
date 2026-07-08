import { getOrCreateUser } from "@/lib/get-or-create-user";
import {
  createSimulationForUser,
  listSimulationsForUser,
  SimulationServiceError,
} from "@/lib/skills/simulations/service";

export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ simulations: await listSimulationsForUser(user.id) });
}
export async function POST(request: Request) {
  const user = await getOrCreateUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) {
    return Response.json({ error: "JSON body must be an object" }, { status: 400 });
  }

  const body = parsedBody as Record<string, unknown>;
  try {
    const result = await createSimulationForUser(user, {
      scenario: typeof body.scenario === "string" ? body.scenario : "",
      narrative: typeof body.narrative === "string" ? body.narrative : undefined,
      title: typeof body.title === "string" ? body.title : undefined,
      timeHorizonYears: Number(body.timeHorizonYears),
    });
    return Response.json({ id: result.id }, { status: 201 });
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
