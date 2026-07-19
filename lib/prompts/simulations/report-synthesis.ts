/**
 * Prompt for synthesizing the final report after all possibility runs complete.
 * Called by `lib/pipelines/simulations/generate-report.ts`.
 */

import type { Possibility, PossibilityRun } from "@/lib/skills/simulations/types";
import { formatSimulationDate } from "@/lib/prompts/simulations/lens-generation";

export function buildReportSynthesisPrompt(
  _userName: string | null,
  vaultContext: string,
  scenario: string,
  _narrative: string,
  possibilities: Possibility[],
  runs: PossibilityRun[],
  timeHorizonYears: number,
  today: Date = new Date()
): string {
  const todayText = formatSimulationDate(today);
  const currentYear = today.getFullYear();
  const runBlocks = runs
    .filter((r) => r.status === "complete" && r.output)
    .map((r) => {
      const p = possibilities.find((p) => p.id === r.possibilityId);
      if (!p) return "";
      return `### ${p.title} (${p.probability}% probability)\n${r.output}`;
    })
    .filter(Boolean)
    .join("\n\n---\n\n");

  const skipped = runs.filter((r) => r.status !== "complete").length;
  const skippedNote =
    skipped > 0
      ? `\n(Note: ${skipped} of ${runs.length} possibilities failed — synthesize from available data.)`
      : "";

  // Find the highest-probability completed run
  const topPossibility = [...possibilities]
    .filter((p) => runs.find((r) => r.possibilityId === p.id && r.status === "complete"))
    .sort((a, b) => b.probability - a.probability)[0];
  const topProbability = topPossibility?.probability ?? 0;

  return `You are synthesizing a scenario simulation for the user. Today's date is ${todayText}; the simulation covers today through roughly ${currentYear + timeHorizonYears}.

## Scenario
${scenario}

## Time Horizon
${timeHorizonYears} year${timeHorizonYears === 1 ? "" : "s"}

## User Context
${vaultContext || "(no context available)"}

## Possibility Runs
${runBlocks}${skippedNote}

## Task

Write a matter-of-fact simulation report. Synthesize across all possibilities to identify what the probability distribution actually supports and what the user should know.
If the scenario names an alternative with wording such as "instead of" or "versus", keep that alternative as the explicit baseline throughout the verdict, summary, and findings. Do not reduce a comparison to a simulation of only the chosen option.

Return ONLY a JSON object with this exact shape:

{
  "verdict": "1–2 concise sentences stating what the paths collectively support, with certainty language calibrated to the probabilities below.",
  "overallConfidence": 0-100,
  "topPossibilityId": "${topPossibility?.id ?? ""}",
  "summary": "2 concise sentences. What is the realistic picture across the probability-weighted paths? What matters most?",
  "outcomes": {
    "title": "Likely Outcomes",
    "points": ["3–4 concise, concrete outcomes at ${timeHorizonYears} years — specific, not generic. Reference probability where useful."]
  },
  "risks": {
    "title": "Key Risks",
    "points": ["3–4 concise, specific risks or failure modes — ordered by likelihood × impact."]
  },
  "insights": {
    "title": "What the Simulation Reveals",
    "points": ["2–3 concise, non-obvious things this analysis surfaced — things the user might not have seen without running it."]
  }
}

Rules:
- Verdict calibration: the single most likely path is "${topPossibility?.title ?? "unknown"}" at ${topProbability}%. Only claim "you will likely X" when the paths leading to outcome X together carry more than 50% probability. If no single path exceeds 35%, the verdict MUST open by stating that no single outcome dominates, then describe the 2–3 clusters of similar paths and their combined probabilities. Manufacturing false certainty is the one failure this report cannot have.
- Temporal grounding: everything in this report is a projection from today (${todayText}) forward. Never describe an event in a year before ${currentYear} as an outcome.
- "overallConfidence" reflects convergence across paths — high if most paths land similarly, low if widely divergent. It is a measure of agreement between paths, NOT the probability that the verdict happens.
- "topPossibilityId" must be the exact id string of the highest-probability possibility that completed.
- Address the user only as "you" and "your" in every user-facing field. Never use any personal name, account name, or third-person pronoun for the user; memory and account names can differ.
- Every bullet earns its place. No filler. No platitudes.
- Keep each bullet to one sentence and the entire JSON response under 450 words so the ten raw paths remain the dominant part of the final result.
- Return ONLY the JSON. No code fences, no prose.`;
}
