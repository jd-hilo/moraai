import { describe, expect, it } from "vitest";
import { buildReportSynthesisPrompt } from "@/lib/prompts/simulations/report-synthesis";

describe("simulation report synthesis prompt", () => {
  it("keeps the final report in second person even when account and memory names differ", () => {
    const prompt = buildReportSynthesisPrompt(
      "Anish",
      "The user prefers to be called Senthy.",
      "Drop out of college",
      "",
      [{ id: "steady", title: "Steady path", description: "Build gradually.", probability: 100 }],
      [{ possibilityId: "steady", status: "complete", output: "You build gradually." }],
      10
    );

    expect(prompt).toContain('Address the user only as "you" and "your"');
    expect(prompt).toContain("Never use any personal name");
    expect(prompt).not.toContain("things Anish might not have seen");
  });

  it("preserves an explicit comparison and caps synthesis length", () => {
    const prompt = buildReportSynthesisPrompt(
      null,
      "The user builds consumer products.",
      "Move to LA instead of SF",
      "",
      [{ id: "steady", title: "Steady path", description: "Build gradually.", probability: 100 }],
      [{ possibilityId: "steady", status: "complete", output: "You build gradually." }],
      5
    );

    expect(prompt).toContain("keep that alternative as the explicit baseline");
    expect(prompt).toContain("entire JSON response under 450 words");
  });
});
