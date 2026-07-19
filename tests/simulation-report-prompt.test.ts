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

  it("forces verdict language to track the actual probability distribution", () => {
    const prompt = buildReportSynthesisPrompt(
      null,
      "context",
      "Move to NYC vs LA",
      "",
      [
        { id: "nyc", title: "The NYC Marketplace", description: "NYC path.", probability: 15 },
        { id: "college", title: "College Convergence", description: "College path.", probability: 15 },
      ],
      [
        { possibilityId: "nyc", status: "complete", output: "You move." },
        { possibilityId: "college", status: "complete", output: "You study." },
      ],
      5,
      new Date("2026-07-19T12:00:00.000Z")
    );

    expect(prompt).toContain('the single most likely path is "The NYC Marketplace" at 15%');
    expect(prompt).toContain('Only claim "you will likely X" when the paths leading to outcome X together carry more than 50%');
    expect(prompt).toContain("no single outcome dominates");
    expect(prompt).toContain("Today's date is July 19, 2026");
    expect(prompt).toContain("NOT the probability that the verdict happens");
  });
});
