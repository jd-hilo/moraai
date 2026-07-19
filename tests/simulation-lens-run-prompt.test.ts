import { describe, expect, it } from "vitest";
import { buildLensRunPrompt } from "@/lib/prompts/simulations/lens-run";

describe("simulation path prompt", () => {
  it("keeps each raw path compact enough to show all ten verbatim", () => {
    const prompt = buildLensRunPrompt(
      "Anish",
      "The user builds consumer products.",
      "Move to LA instead of SF to build a consumer company",
      "",
      {
        id: "steady",
        title: "Steady builder",
        description: "The company grows gradually.",
        probability: 20,
      },
      5
    );

    expect(prompt).toContain("exactly one compact paragraph of 120–160 words");
    expect(prompt).toContain("all 10 raw paths");
    expect(prompt).toContain('If the scenario says "instead of", "versus"');
    expect(prompt).not.toContain("3–4 paragraphs");
  });

  it("anchors the account to today, defines confidence, and bans guessed names and ages", () => {
    const prompt = buildLensRunPrompt(
      "Anish",
      "The user builds consumer products.",
      "Move to LA",
      "",
      { id: "steady", title: "Steady builder", description: "Grows gradually.", probability: 20 },
      5,
      new Date("2026-07-19T12:00:00.000Z")
    );

    expect(prompt).toContain("Today's date is July 19, 2026");
    expect(prompt).toContain("Never place a new event in a year before 2026");
    expect(prompt).toContain('Address the user only as "you" and "your"');
    expect(prompt).toContain("Do not state the user's age");
    expect(prompt).toContain("NOT the probability this path occurs");
  });
});
