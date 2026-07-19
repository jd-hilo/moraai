/**
 * Prompt for generating the 10 possibilities for a simulation.
 * Called by `lib/pipelines/simulations/generate-lenses.ts`.
 *
 * Each possibility is a distinct trajectory the scenario could take —
 * NOT a relationship lens. Think Monte Carlo paths, not personas.
 */

import { POSSIBILITY_COUNT } from "@/lib/skills/simulations/types";

export function formatSimulationDate(today: Date): string {
  return today.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function buildLensGenerationPrompt(
  userName: string | null,
  vaultContext: string,
  scenario: string,
  narrative: string | null,
  timeHorizonYears: number,
  today: Date = new Date()
): string {
  const name = userName ?? "the user";
  const todayText = formatSimulationDate(today);
  const currentYear = today.getFullYear();
  const endYear = currentYear + timeHorizonYears;
  const narrativeNote = narrative
    ? `\n## Their Take on How It Plays Out\n${narrative}\n`
    : "";

  return `You are a scenario analyst. Today's date is ${todayText}. Given the situation below, generate exactly ${POSSIBILITY_COUNT} distinct possibilities — the different trajectories this scenario could realistically take over ${timeHorizonYears} year${timeHorizonYears === 1 ? "" : "s"}, from today through roughly ${endYear}.

## Scenario
${scenario}
${narrativeNote}
## Context About ${name}
${vaultContext || "(no context available)"}

## Signal Check (do this first)

If the scenario is gibberish, placeholder text (random characters, keyboard mashing), or so vague that you cannot tell what decision or change is actually being weighed, do NOT invent one. Instead return ONLY this JSON object and nothing else:
{"error": "unclear_scenario", "question": "one specific clarifying question to ask the user about what they want to simulate"}

## Instructions

Each possibility is a specific, plausible path this scenario could follow. Together, the ${POSSIBILITY_COUNT} possibilities should cover the realistic probability space — not just optimistic vs pessimistic, but the nuanced middle paths, unexpected pivots, and edge cases.

Rules:
- Temporal anchoring: every path starts at today's date (${todayText}) and moves strictly forward. Never place any path event in a year before ${currentYear}. Any calendar year you mention must be ${currentYear} or later and consistent with the ${timeHorizonYears}-year horizon.
- Ground possibilities in ${name}'s actual context. Their financial situation, relationships, skills, and history should make some paths more or less likely.
- Use only facts that appear in the context. Do not state ${name}'s age, grade, or graduation year unless the context states it explicitly — never guess. Do not invent named companies, named people, or precise recurring dollar amounts; hypothetical specifics must stay generic ("a sponsor", "an accelerator").
- Structural diversity: if the scenario weighs multiple options ("X vs Y", "instead of"), spread the ${POSSIBILITY_COUNT} paths across ALL named options, plus at least one hybrid or "neither" path. No two paths may open with the same first move, and each path's outcome should hinge on a different dominant driver (timing, money, relationships, health, location, motivation, an external shock). Do not recycle the same events or signature phrases across paths.
- Give each a probability (0–100). All ${POSSIBILITY_COUNT} probabilities should sum to approximately 100.
- Titles should be vivid but factual: "The Slow Build", "The Stall at Year 2", "The Unexpected Pivot" — not generic.
- Descriptions: 2–3 sentences. What concretely happens? What's the key driver of this path?
- Distribute realistically: most paths cluster around the median outcome; a few edge cases at either extreme.

## Output Format

Return ONLY a JSON array (or the unclear-scenario object from the Signal Check). No prose, no code fences.

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
