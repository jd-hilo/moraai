import { getOrCreateUser } from "@/lib/get-or-create-user";
import { getOrResetCredits, WEEKLY_CREDITS, WEEK_MS } from "@/lib/credits";

/**
 * GET /api/credits
 *   → Current user's credit balance + when it resets.
 *     The `getOrResetCredits` call auto-applies the weekly reset if due,
 *     so the UI always sees up-to-date numbers.
 */
export async function GET() {
  const user = await getOrCreateUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const status = await getOrResetCredits(user.id);
  const nextResetAt = new Date(status.creditsResetAt.getTime() + WEEK_MS);

  return Response.json({
    credits: status.credits,
    weeklyCredits: WEEKLY_CREDITS,
    resetsAt: nextResetAt.toISOString(),
  });
}
