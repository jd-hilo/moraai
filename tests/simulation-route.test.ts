import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrCreateUser: vi.fn(),
  createSimulationForUser: vi.fn(),
  listSimulationsForUser: vi.fn(),
}));

vi.mock("@/lib/get-or-create-user", () => ({
  getOrCreateUser: mocks.getOrCreateUser,
}));

vi.mock("@/lib/skills/simulations/service", () => ({
  createSimulationForUser: mocks.createSimulationForUser,
  listSimulationsForUser: mocks.listSimulationsForUser,
  SimulationServiceError: class SimulationServiceError extends Error {
    constructor(
      public code: string,
      public status: number,
      message: string,
      public details?: Record<string, unknown>
    ) {
      super(message);
    }
  },
}));

import { POST } from "@/app/api/skills/simulations/route";

describe("simulation POST route", () => {
  beforeEach(() => {
    mocks.getOrCreateUser.mockResolvedValue({ id: "mora-user" });
    mocks.createSimulationForUser.mockResolvedValue({ id: "sim-one" });
  });

  it("rejects null and non-object JSON before invoking the service", async () => {
    const response = await POST(
      new Request("https://mora.example/api/skills/simulations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "null",
      })
    );

    expect(response.status).toBe(400);
    expect(mocks.createSimulationForUser).not.toHaveBeenCalled();
  });

  it("does not mislabel a service SyntaxError as malformed request JSON", async () => {
    const providerError = new SyntaxError("provider response failed");
    mocks.createSimulationForUser.mockRejectedValueOnce(providerError);

    await expect(
      POST(
        new Request("https://mora.example/api/skills/simulations", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ scenario: "Move", timeHorizonYears: 3 }),
        })
      )
    ).rejects.toBe(providerError);
  });
});
