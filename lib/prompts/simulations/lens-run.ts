/**
 * Prompt for running a single possibility through the scenario.
 * Called once per possibility (in parallel) by
 * `lib/pipelines/simulations/run-lens-simulation.ts`.
 */

import type { Possibility } from "@/lib/skills/simulations/types";
import { formatSimulationDate } from "@/lib/prompts/simulations/lens-generation";

export function buildLensRunPrompt(
  userName: string | null,
  vaultContext: string,
  scenario: string,
  _narrative: string,
  possibility: Possibility,
  timeHorizonYears: number,
  today: Date = new Date()
): string {
  const name = userName ?? "the user";
  const todayText = formatSimulationDate(today);
  const currentYear = today.getFullYear();
  const endYear = currentYear + timeHorizonYears;

  return `You are running a scenario simulation. Today's date is ${todayText}. Describe concretely how the following possibility plays out for ${name} over ${timeHorizonYears} year${timeHorizonYears === 1 ? "" : "s"} — starting today and ending around ${endYear}.

## Scenario
${scenario}

## This Possibility (${possibility.probability}% probability)
**${possibility.title}**
${possibility.description}

## Context About ${name}
${vaultContext || "(no context available)"}

## Instructions

Write a matter-of-fact account of how this path unfolds. Be specific:
- The account begins today (${todayText}) and moves strictly forward. Never place a new event in a year before ${currentYear}; mention earlier years only for facts already stated in the context.
- Cover the key early, middle, and final-horizon moments
- Name concrete decisions, turning points, and consequences
- Use real-feeling specifics: numbers, timelines, tradeoffs — but only draw named companies, named people, employers, and exact figures from the context. Invented specifics must stay generic ("a sponsor", "a seed investor"), never fabricated real-sounding names or precise recurring dollar amounts presented as fact.
- Address the user only as "you" and "your". Never use any personal name or nickname, even ones that appear in the context for the user.
- Do not state the user's age, grade, or graduation year unless the context states it explicitly — never guess or infer it.
- Where relevant, reference how this affects ${name}'s relationships, finances, or career based on their context
- If the scenario says "instead of", "versus", or otherwise names an alternative, explicitly compare this path with that alternative rather than simulating the chosen option in isolation
- No fluff, no hedging, no "it could go either way" — this is the version where *this* possibility happens

Write exactly one compact paragraph of 120–160 words. Second person ("you"). Factual tone. The strict length limit is required so all 10 raw paths can be shown to the user without summarization.

After your account, on its own line, write exactly:
SIGNAL: {outlook} | CONFIDENCE: {score}

Where {outlook} is one of: positive, negative, mixed, uncertain
And {score} is 0–100: how well-grounded this account is in the user's recorded context. It is NOT the probability this path occurs — that is fixed above at ${possibility.probability}%.

Return ONLY the account + signal line.`;
}
