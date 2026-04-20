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
- Walk through the key moments year by year (Year 1, Year 2–3, Year ${timeHorizonYears})
- Name concrete decisions, turning points, and consequences
- Use real-feeling specifics: numbers, timelines, tradeoffs
- Where relevant, reference how this affects ${name}'s relationships, finances, or career based on their context
- No fluff, no hedging, no "it could go either way" — this is the version where *this* possibility happens

3–4 paragraphs. Second person ("you"). Factual tone.

After your account, on its own line, write exactly:
SIGNAL: {outlook} | CONFIDENCE: {score}

Where {outlook} is one of: positive, negative, mixed, uncertain
And {score} is 0–100 (your confidence this trajectory holds if this path is taken).

Return ONLY the account + signal line.`;
}
