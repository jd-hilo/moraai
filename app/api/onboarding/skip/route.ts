import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/get-or-create-user";

// Marks the user's onboarding complete without running the import pipeline.
// Called when the user explicitly chooses to skip (e.g. after an import
// error, or from a "I'll do this later" CTA).
export async function POST() {
  const user = await getOrCreateUser();
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { onboardingComplete: true, importStatus: "skipped" },
  });
  return Response.json({ success: true });
}
