import { callLLM } from "@/lib/providers/call";
import { buildLensGenerationPrompt } from "@/lib/prompts/simulations/lens-generation";
import { POSSIBILITY_COUNT, type Possibility } from "@/lib/skills/simulations/types";

/**
 * Thrown when the model judges the scenario too vague or nonsensical to
 * simulate. Carries the clarifying question to surface to the user instead
 * of fabricating a decision on their behalf.
 */
export class UnclearScenarioError extends Error {
  constructor(public question: string) {
    super(question);
    this.name = "UnclearScenarioError";
  }
}

const FALLBACK_CLARIFYING_QUESTION =
  "What decision or change do you want Mora to simulate? Describe it as a concrete what-if.";

/** Years earlier than this are past for the run and must not appear as path events. */
function pastYearViolations(possibilities: Possibility[], currentYear: number): string[] {
  const violations: string[] = [];
  for (const possibility of possibilities) {
    const years = `${possibility.title} ${possibility.description}`.match(/\b(?:19|20)\d{2}\b/g) ?? [];
    for (const year of years) {
      if (Number(year) < currentYear) violations.push(`${possibility.id}: ${year}`);
    }
  }
  return violations;
}

/**
 * Generate exactly 10 possibilities for the scenario.
 * Called by the kickoffLensGeneration fire-and-forget in the POST /simulations route.
 */
export async function generateLenses(params: {
  userName: string | null;
  vaultContext: string;
  scenario: string;
  narrative: string | null;
  timeHorizonYears: number;
  userId?: string;
}): Promise<Possibility[]> {
  const today = new Date();
  const prompt = buildLensGenerationPrompt(
    params.userName,
    params.vaultContext,
    params.scenario,
    params.narrative,
    params.timeHorizonYears,
    today
  );

  const currentYear = today.getFullYear();
  let possibilities = await requestPossibilities(prompt, params);

  // Post-generation temporal validator: reject a first attempt that anchors
  // any path in a past year, and regenerate once with an explicit correction.
  const violations = pastYearViolations(possibilities, currentYear);
  if (violations.length > 0) {
    const correctedPrompt = `${prompt}\n\nIMPORTANT CORRECTION: your previous attempt placed events in past years (${violations.join(
      ", "
    )}). Every path must start at today's date and use only year ${currentYear} or later. Regenerate all ${POSSIBILITY_COUNT} possibilities.`;
    possibilities = await requestPossibilities(correctedPrompt, params);
    const remaining = pastYearViolations(possibilities, currentYear);
    if (remaining.length > 0) {
      console.warn(
        `[simulations] possibilities still reference past years after retry: ${remaining.join(", ")}`
      );
    }
  }

  return possibilities;
}

async function requestPossibilities(
  prompt: string,
  params: { userId?: string }
): Promise<Possibility[]> {
  const text = await callLLM({
    anthropicModel: "claude-haiku-4-5-20251001",
    openaiModel: "gpt-4o",
    prompt,
    maxTokens: 2000,
    userId: params.userId,
    action: "simulation.lens",
  });

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throwIfUnclearScenario(text);
    throw new Error(`Possibility generation returned no JSON array: ${text.slice(0, 300)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new Error(`Possibility JSON failed to parse: ${(err as Error).message}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Possibility output was not a JSON array.");
  }

  const possibilities: Possibility[] = [];
  const usedIds = new Set<string>();

  for (const raw of parsed) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;

    const title = typeof r.title === "string" ? r.title.trim() : "";
    if (!title) continue;

    const description = typeof r.description === "string" ? r.description.trim() : "";
    const probability =
      typeof r.probability === "number"
        ? Math.min(100, Math.max(0, Math.round(r.probability)))
        : 10;

    let id = typeof r.id === "string" && r.id.trim() ? r.id.trim() : slugify(title);
    if (!id) id = `possibility-${possibilities.length + 1}`;
    let candidate = id;
    let n = 2;
    while (usedIds.has(candidate)) candidate = `${id}-${n++}`;
    usedIds.add(candidate);

    possibilities.push({ id: candidate, title, description, probability });
  }

  // Trim or pad to POSSIBILITY_COUNT
  const trimmed = possibilities.slice(0, POSSIBILITY_COUNT);
  while (trimmed.length < POSSIBILITY_COUNT) {
    const idx = trimmed.length + 1;
    trimmed.push({
      id: `possibility-${idx}`,
      title: `Path ${idx}`,
      description: "(Auto-filled — model returned fewer than 10 possibilities.)",
      probability: 5,
    });
  }

  return trimmed;
}

function throwIfUnclearScenario(text: string): void {
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (!objectMatch) return;
  try {
    const parsed = JSON.parse(objectMatch[0]) as { error?: unknown; question?: unknown };
    if (parsed.error === "unclear_scenario") {
      throw new UnclearScenarioError(
        typeof parsed.question === "string" && parsed.question.trim()
          ? parsed.question.trim()
          : FALLBACK_CLARIFYING_QUESTION
      );
    }
  } catch (error) {
    if (error instanceof UnclearScenarioError) throw error;
    // Not parseable JSON — fall through to the generic error in the caller.
  }
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
