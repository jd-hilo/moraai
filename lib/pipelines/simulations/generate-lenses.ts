import { callLLM } from "@/lib/providers/call";
import { buildLensGenerationPrompt } from "@/lib/prompts/simulations/lens-generation";
import { POSSIBILITY_COUNT, type Possibility } from "@/lib/skills/simulations/types";

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
}): Promise<Possibility[]> {
  const prompt = buildLensGenerationPrompt(
    params.userName,
    params.vaultContext,
    params.scenario,
    params.narrative,
    params.timeHorizonYears
  );

  const text = await callLLM({
    anthropicModel: "claude-haiku-4-5-20251001",
    openaiModel: "gpt-4o",
    prompt,
    maxTokens: 2000,
  });

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}
