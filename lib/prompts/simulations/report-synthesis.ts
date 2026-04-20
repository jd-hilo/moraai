/**
 * Prompt for synthesizing the final report after all possibility runs complete.
 * Called by `lib/pipelines/simulations/generate-report.ts`.
 */

import type { Possibility, PossibilityRun } from "@/lib/skills/simulations/types";

export function buildReportSynthesisPrompt(
  userName: string | null,
  vaultContext: string,
  scenario: string,
  _narrative: string,
  possibilities: Possibility[],
  runs: PossibilityRun[],
  timeHorizonYears: number
): string {
  const name = userName ?? "the user";

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

  return `You are synthesizing a scenario simulation for ${name}.

## Scenario
${scenario}

## Time Horizon
${timeHorizonYears} year${timeHorizonYears === 1 ? "" : "s"}

## ${name}'s Context
${vaultContext || "(no context available)"}

## Possibility Runs
${runBlocks}${skippedNote}

## Task

Write a matter-of-fact simulation report. Synthesize across all possibilities to identify the most likely outcome and what ${name} should know.

Return ONLY a JSON object with this exact shape:

{
  "verdict": "1–2 sentence plain-language prediction. State the most likely outcome factually. No hedging.",
  "overallConfidence": 0-100,
  "topPossibilityId": "${topPossibility?.id ?? ""}",
  "summary": "2–3 sentence paragraph. What is the realistic picture across the probability-weighted paths? What matters most?",
  "outcomes": {
    "title": "Likely Outcomes",
    "points": ["4–6 concrete outcomes at ${timeHorizonYears} years — specific, not generic. Reference probability where useful."]
  },
  "risks": {
    "title": "Key Risks",
    "points": ["3–5 specific risks or failure modes — ordered by likelihood × impact."]
  },
  "insights": {
    "title": "What the Simulation Reveals",
    "points": ["3–4 non-obvious things this analysis surfaced — things ${name} might not have seen without running it."]
  }
}

Rules:
- "overallConfidence" reflects convergence across paths — high if most paths land similarly, low if widely divergent.
- "topPossibilityId" must be the exact id string of the highest-probability possibility that completed.
- Every bullet earns its place. No filler. No platitudes.
- Return ONLY the JSON. No code fences, no prose.`;
}
