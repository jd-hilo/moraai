import { callLLM } from "@/lib/providers/call";
import { buildNarrativeGenerationPrompt } from "@/lib/prompts/simulations/narrative-generation";
import type { Possibility } from "@/lib/skills/simulations/types";

/**
 * Generate a neutral play-by-play of how the scenario unfolds over the
 * time horizon, when the user didn't provide one.
 */
export async function generateNarrative(params: {
  userName: string | null;
  vaultContext: string;
  scenario: string;
  lenses: Possibility[];
  timeHorizonYears: number;
}): Promise<string> {
  const prompt = buildNarrativeGenerationPrompt(
    params.userName,
    params.vaultContext,
    params.scenario,
    params.lenses,
    params.timeHorizonYears
  );

  const text = await callLLM({
    anthropicModel: "claude-sonnet-4-6",
    openaiModel: "gpt-4o",
    prompt,
    maxTokens: 2000,
  });

  return text.trim();
}
