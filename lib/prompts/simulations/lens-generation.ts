/**
 * Prompt for generating the 10 possibilities for a simulation.
 * Called by `lib/pipelines/simulations/generate-lenses.ts`.
 *
 * Each possibility is a distinct trajectory the scenario could take —
 * NOT a relationship lens. Think Monte Carlo paths, not personas.
 */

import { POSSIBILITY_COUNT } from "@/lib/skills/simulations/types";

export function buildLensGenerationPrompt(
  userName: string | null,
  vaultContext: string,
  scenario: string,
  narrative: string | null,
  timeHorizonYears: number
): string {
  const name = userName ?? "the user";
  const narrativeNote = narrative
    ? `\n## Their Take on How It Plays Out\n${narrative}\n`
    : "";

  return `You are a scenario analyst. Given the situation below, generate exactly ${POSSIBILITY_COUNT} distinct possibilities — the different trajectories this scenario could realistically take over ${timeHorizonYears} year${timeHorizonYears === 1 ? "" : "s"}.

## Scenario
${scenario}
${narrativeNote}
## Context About ${name}
${vaultContext || "(no context available)"}

## Instructions

Each possibility is a specific, plausible path this scenario could follow. Together, the ${POSSIBILITY_COUNT} possibilities should cover the realistic probability space — not just optimistic vs pessimistic, but the nuanced middle paths, unexpected pivots, and edge cases.

Rules:
- Ground possibilities in ${name}'s actual context. Their financial situation, relationships, skills, and history should make some paths more or less likely.
- Give each a probability (0–100). All ${POSSIBILITY_COUNT} probabilities should sum to approximately 100.
- Titles should be vivid but factual: "The Slow Build", "The Stall at Year 2", "The Unexpected Pivot" — not generic.
- Descriptions: 2–3 sentences. What concretely happens? What's the key driver of this path?
- Distribute realistically: most paths cluster around the median outcome; a few edge cases at either extreme.

## Output Format

Return ONLY a JSON array. No prose, no code fences.

[
  {
    "id": "kebab-id",
    "title": "Path Title",
    "description": "2–3 sentences describing what happens on this path.",
    "probability": 20
  }
]

Return the array now.`;
}
