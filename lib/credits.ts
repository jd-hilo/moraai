import { prisma } from "@/lib/prisma";

/**
 * Mora's credit system — soft weekly budget of $5 API spend per user.
 * 1 credit = $0.01 (so 500 credits/week = $5/week).
 *
 * Design goals:
 *  - Cheap: one extra DB read + write per LLM call
 *  - Transparent: each charge is logged to UsageEvent
 *  - Forgiving: we check credits BEFORE a call and deduct AFTER based on
 *    real token usage. If a user is slightly over after a charge, we allow
 *    it — we don't mid-stream cancel.
 *  - Self-healing: credits auto-reset on the first request after 7 days.
 */

export const WEEKLY_CREDITS = 500;
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

// Anthropic pricing (USD per million tokens) as of April 2026.
// Keep in sync with https://www.anthropic.com/pricing
const ANTHROPIC_PRICING: Record<string, { in: number; out: number }> = {
  "claude-haiku-4-5-20251001": { in: 1, out: 5 },
  "claude-sonnet-4-6": { in: 3, out: 15 },
  "claude-sonnet-4-5": { in: 3, out: 15 },
};

// OpenAI fallback pricing.
const OPENAI_PRICING: Record<string, { in: number; out: number }> = {
  "gpt-4o": { in: 2.5, out: 10 },
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
};

function getPricing(model: string): { in: number; out: number } {
  return (
    ANTHROPIC_PRICING[model] ??
    OPENAI_PRICING[model] ??
    // Unknown model — fall back to Sonnet pricing (conservative upper bound).
    { in: 3, out: 15 }
  );
}

/**
 * Convert token counts to credits (integer cents of USD).
 * Always rounds up so we never under-charge.
 */
export function costToCredits(
  inputTokens: number,
  outputTokens: number,
  model: string
): number {
  const p = getPricing(model);
  const dollars =
    (inputTokens / 1_000_000) * p.in + (outputTokens / 1_000_000) * p.out;
  return Math.max(1, Math.ceil(dollars * 100));
}

export interface CreditStatus {
  credits: number;
  creditsResetAt: Date;
  weeklyCredits: number;
}

/**
 * Read current credits, auto-resetting the weekly allotment if the reset
 * window has passed. Called at the start of any endpoint that spends credits.
 */
export async function getOrResetCredits(userId: string): Promise<CreditStatus> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true, creditsResetAt: true },
  });
  if (!user) throw new Error(`User not found: ${userId}`);

  const now = Date.now();
  const resetAt = user.creditsResetAt.getTime();

  if (now - resetAt >= WEEK_MS) {
    // Weekly reset is due.
    const newResetAt = new Date(now);
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { credits: WEEKLY_CREDITS, creditsResetAt: newResetAt },
      select: { credits: true, creditsResetAt: true },
    });
    return {
      credits: updated.credits,
      creditsResetAt: updated.creditsResetAt,
      weeklyCredits: WEEKLY_CREDITS,
    };
  }

  return {
    credits: user.credits,
    creditsResetAt: user.creditsResetAt,
    weeklyCredits: WEEKLY_CREDITS,
  };
}

/**
 * Assert the user has at least `minCredits` available (after applying any
 * pending reset). Returns remaining credits. Throws `CreditsExhaustedError`
 * if the user is out.
 */
export class CreditsExhaustedError extends Error {
  constructor(
    public credits: number,
    public creditsResetAt: Date,
    public needed: number
  ) {
    super(
      `Out of credits: have ${credits}, need ${needed}. Resets at ${creditsResetAt.toISOString()}`
    );
    this.name = "CreditsExhaustedError";
  }
}

export async function requireCredits(
  userId: string,
  minCredits = 1
): Promise<CreditStatus> {
  const status = await getOrResetCredits(userId);
  if (status.credits < minCredits) {
    throw new CreditsExhaustedError(status.credits, status.creditsResetAt, minCredits);
  }
  return status;
}

/**
 * Record an LLM call and deduct its credit cost from the user's balance.
 * Uses a single atomic Prisma transaction so concurrent calls can't
 * race past zero by more than one in-flight request.
 *
 * Returns the new credit balance.
 */
export async function chargeUsage(params: {
  userId: string;
  action: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}): Promise<number> {
  const { userId, action, model, inputTokens, outputTokens } = params;
  const credits = costToCredits(inputTokens, outputTokens, model);

  const [, updated] = await prisma.$transaction([
    prisma.usageEvent.create({
      data: { userId, action, model, inputTokens, outputTokens, credits },
    }),
    prisma.user.update({
      where: { id: userId },
      // Can go slightly negative if a response used more tokens than
      // our pre-check estimated. That's fine — the next request will block.
      data: { credits: { decrement: credits } },
      select: { credits: true },
    }),
  ]);
  return updated.credits;
}
