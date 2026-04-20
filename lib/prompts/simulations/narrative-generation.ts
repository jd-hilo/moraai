/**
 * Prompt for generating the play-by-play narrative when the user didn't
 * provide one. Called by `lib/pipelines/simulations/generate-narrative.ts`.
 */

import type { Possibility } from "@/lib/skills/simulations/types";

export function buildNarrativeGenerationPrompt(
  userName: string | null,
  vaultContext: string,
  scenario: string,
  possibilities: Possibility[],
  timeHorizonYears: number
): string {
  const name = userName ?? "the user";
  const topPossibilities = [...possibilities]
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3)
    .map((p) => `- ${p.title} (${p.probability}%)`)
    .join("\n");

  return `You are helping ${name} run a scenario simulation. They gave a trigger but no narrative context, so write one.

## Scenario
${scenario}

## Time Horizon
${timeHorizonYears} year${timeHorizonYears === 1 ? "" : "s"}

## ${name}'s Context
${vaultContext || "(no context available)"}

## Most Likely Paths (for reference)
${topPossibilities}

## Task

Write a concise, neutral account of the scenario setup — the context going in, what triggers the change, and the immediate first few months. 2–3 paragraphs. Matter-of-fact tone. This is the shared starting point all 10 possibilities branch from — don't describe the outcome, just the setup and launch.

Return ONLY the narrative text. No headers.`;
}
