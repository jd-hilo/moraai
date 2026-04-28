import { getOrCreateUser } from "@/lib/get-or-create-user";

// Lightweight status probe so the client can recover from a dropped
// import-stream connection. If the function actually finished server-side
// (common on Hobby when the response stream gets cut but the work keeps
// running), the client can detect that and proceed instead of showing an
// error.
export async function GET() {
  const user = await getOrCreateUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return Response.json({
    onboardingComplete: user.onboardingComplete,
    importStatus: user.importStatus ?? null,
  });
}
