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
- Titles are the shareable forecast headline for each path. Make each one understandable on its own, concrete enough to stop a scroll, and faithful to what actually happens in that path.
- Title format: 4–9 words, consequence-led, and written in plain language. Preview the projected end state or decisive turning point instead of assigning an abstract archetype.
- Prefer a grounded forecast anchor whenever the scenario supports one: projected net worth, income, savings runway, revenue, time to a milestone, role, location, relationship state, health or lifestyle outcome. Across the ${POSSIBILITY_COUNT} paths, vary the outcome dimensions instead of making every title about money.
- Forecast numbers are allowed when they are derived from known context or explicit assumptions in that path. Use rounded figures, ranges, or directional language when exact precision is not justified. Never present an invented current fact, name, company, or falsely precise number just to make a title punchier.
- Vary the title shapes across the ${POSSIBILITY_COUNT} paths so they do not read like a templated list. A title should still make sense if someone sees only that title in a screenshot.
- Avoid generic labels and empty drama. Do not begin titles with "The", "Path", "Scenario", "Journey", "Future", "Outcome", or "Possibility". Do not use questions, clickbait, motivational hype, or unsupported certainty.
- Style examples (the projected detail must be supported by that path): "Net Worth Crosses $250K by Year 5", "$18K Runway Ends Before Product-Market Fit", "Revenue Replaces Your Salary in Year 3", "A Promotion Delays the Startup Two Years", "You Move Cities and Cut Expenses 30%".
- Bad titles: "The Slow Build", "The Unexpected Pivot", "A New Chapter", "Path 4", "Success Is Inevitable".
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
