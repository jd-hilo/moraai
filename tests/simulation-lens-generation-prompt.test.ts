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

  it("asks for concrete, shareable titles without clickbait or invented precision", () => {
    const prompt = buildLensGenerationPrompt(
      "Anish",
      "The user is weighing whether to build a company full-time.",
      "Leave my job to build my company",
      null,
      5,
      TODAY
    );

    expect(prompt).toContain("shareable forecast headline for each path");
    expect(prompt).toContain("4–9 words, consequence-led");
    expect(prompt).toContain("make sense if someone sees only that title in a screenshot");
    expect(prompt).toContain("projected net worth, income, savings runway, revenue");
    expect(prompt).toContain("Forecast numbers are allowed");
    expect(prompt).toContain("Use rounded figures, ranges, or directional language");
    expect(prompt).toContain("Never present an invented current fact");
    expect(prompt).toContain('Do not begin titles with "The"');
    expect(prompt).toContain('"Net Worth Crosses $250K by Year 5"');
    expect(prompt).toContain('"Revenue Replaces Your Salary in Year 3"');
    expect(prompt).toContain('Bad titles: "The Slow Build"');
    expect(prompt).toContain("Do not use questions, clickbait, motivational hype, or unsupported certainty");
  });
});
