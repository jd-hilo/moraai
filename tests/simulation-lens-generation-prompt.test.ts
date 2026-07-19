import { describe, expect, it } from "vitest";
import { buildLensGenerationPrompt } from "@/lib/prompts/simulations/lens-generation";

const TODAY = new Date("2026-07-19T12:00:00.000Z");

describe("simulation possibility generation prompt", () => {
  it("anchors every path to today's date and forbids past years", () => {
    const prompt = buildLensGenerationPrompt(
      "Anish",
      "The user builds consumer products.",
      "Move to NYC vs LA vs Austin",
      null,
      5,
      TODAY
    );

    expect(prompt).toContain("Today's date is July 19, 2026");
    expect(prompt).toContain("Never place any path event in a year before 2026");
    expect(prompt).toContain("through roughly 2031");
  });

  it("asks a clarifying question for gibberish instead of inventing a decision", () => {
    const prompt = buildLensGenerationPrompt("Anish", "", "asdf jkl qwerty", null, 3, TODAY);
    expect(prompt).toContain('"error": "unclear_scenario"');
    expect(prompt).toContain("do NOT invent one");
  });

  it("requires structural diversity across named alternatives and forbids invented canon", () => {
    const prompt = buildLensGenerationPrompt(
      null,
      "context",
      "Move to NYC vs LA vs Austin",
      null,
      5,
      TODAY
    );
    expect(prompt).toContain("spread the 10 paths across ALL named options");
    expect(prompt).toContain("No two paths may open with the same first move");
    expect(prompt).toContain("Do not invent named companies");
    expect(prompt).toContain("never guess");
  });
});
