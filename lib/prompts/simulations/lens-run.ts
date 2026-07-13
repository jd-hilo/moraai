/**
 * Prompt for running a single possibility through the scenario.
 * Called once per possibility (in parallel) by
 * `lib/pipelines/simulations/run-lens-simulation.ts`.
 */

import type { Possibility } from "@/lib/skills/simulations/types";

export function buildLensRunPrompt(
  userName: string | null,
  vaultContext: string,
  scenario: string,
  _narrative: string,
  possibility: Possibility,
  timeHorizonYears: number
): string {
  const name = userName ?? "the user";

  return `You are running a scenario simulation. Describe concretely how the following possibility plays out for ${name} over ${timeHorizonYears} year${timeHorizonYears === 1 ? "" : "s"}.

## Scenario
${scenario}

## This Possibility (${possibility.probability}% probability)
**${possibility.title}**
${possibility.description}

## Context About ${name}
${vaultContext || "(no context available)"}

## Instructions

Write a matter-of-fact account of how this path unfolds. Be specific:
- Cover the key early, middle, and final-horizon moments
- Name concrete decisions, turning points, and consequences
- Use real-feeling specifics: numbers, timelines, tradeoffs
- Where relevant, reference how this affects ${name}'s relationships, finances, or career based on their context
- If the scenario says "instead of", "versus", or otherwise names an alternative, explicitly compare this path with that alternative rather than simulating the chosen option in isolation
- No fluff, no hedging, no "it could go either way" — this is the version where *this* possibility happens

Write exactly one compact paragraph of 120–160 words. Second person ("you"). Factual tone. The strict length limit is required so all 10 raw paths can be shown to the user without summarization.

After your account, on its own line, write exactly:
SIGNAL: {outlook} | CONFIDENCE: {score}

Where {outlook} is one of: positive, negative, mixed, uncertain
And {score} is 0–100 (your confidence this trajectory holds if this path is taken).

Return ONLY the account + signal line.`;
}
