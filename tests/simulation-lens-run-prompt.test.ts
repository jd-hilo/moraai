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
});
