import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ callLLM: vi.fn() }));
vi.mock("@/lib/providers/call", () => ({ callLLM: mocks.callLLM }));

import { generateLenses, UnclearScenarioError } from "@/lib/pipelines/simulations/generate-lenses";

const params = {
  userName: "Anish",
  vaultContext: "context",
  scenario: "Move to Austin",
  narrative: null,
  timeHorizonYears: 3,
  userId: "alpha",
};

function possibilitiesJson(description: string): string {
  return JSON.stringify(
    Array.from({ length: 10 }, (_, i) => ({
      id: `path-${i + 1}`,
      title: `Path ${i + 1}`,
      description,
      probability: 10,
    }))
  );
}

describe("possibility generation pipeline", () => {
  beforeEach(() => {
    mocks.callLLM.mockReset();
  });

  it("surfaces the model's clarifying question instead of fabricating a scenario", async () => {
    mocks.callLLM.mockResolvedValue(
      '{"error": "unclear_scenario", "question": "What decision do you want to explore?"}'
    );

    await expect(generateLenses(params)).rejects.toBeInstanceOf(UnclearScenarioError);
    await expect(generateLenses(params)).rejects.toMatchObject({
      question: "What decision do you want to explore?",
    });
  });

  it("rejects paths anchored in past years and regenerates once with a correction", async () => {
    const currentYear = new Date().getFullYear();
    mocks.callLLM
      .mockResolvedValueOnce(possibilitiesJson(`You drop out in ${currentYear - 2}.`))
      .mockResolvedValueOnce(possibilitiesJson(`You start this fall of ${currentYear}.`));

    const possibilities = await generateLenses(params);

    expect(mocks.callLLM).toHaveBeenCalledTimes(2);
    expect(mocks.callLLM.mock.calls[1][0].prompt).toContain("IMPORTANT CORRECTION");
    expect(possibilities).toHaveLength(10);
    expect(possibilities[0].description).toContain(`${currentYear}`);
  });

  it("accepts clean future-anchored output on the first attempt", async () => {
    const currentYear = new Date().getFullYear();
    mocks.callLLM.mockResolvedValue(possibilitiesJson(`You relocate by ${currentYear + 1}.`));

    const possibilities = await generateLenses(params);

    expect(mocks.callLLM).toHaveBeenCalledTimes(1);
    expect(possibilities).toHaveLength(10);
  });
});
