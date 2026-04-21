import { callLLM } from "@/lib/providers/call";
import { buildLensRunPrompt } from "@/lib/prompts/simulations/lens-run";
import type { Possibility } from "@/lib/skills/simulations/types";

export interface PossibilitySimulationResult {
  output: string;
  confidence?: number;
  outlook?: "positive" | "negative" | "mixed" | "uncertain";
}

/**
 * Run a single possibility through the scenario.
 * Returns the narrative output plus parsed confidence and outlook signal.
 */
export async function runLensSimulation(params: {
  userName: string | null;
  vaultContext: string;
  scenario: string;
  narrative: string;
  lens: Possibility;
  timeHorizonYears: number;
  userId?: string;
}): Promise<PossibilitySimulationResult> {
  const prompt = buildLensRunPrompt(
    params.userName,
    params.vaultContext,
    params.scenario,
    params.narrative,
    params.lens,
    params.timeHorizonYears
  );

  const twinIdentity = params.userName
    ? `You are a digital twin of ${params.userName}. You think, reason, and make decisions exactly as they would — using their memories, values, patterns, and goals as your own. When simulating a future, embody them completely.`
    : "You are a digital twin of the user. Embody their thinking, values, and decision-making patterns completely when simulating this future.";

  const raw = await callLLM({
    anthropicModel: "claude-haiku-4-5-20251001",
    openaiModel: "gpt-4o-mini",
    system: twinIdentity,
    prompt,
    maxTokens: 1200,
    userId: params.userId,
    action: "simulation.run",
  });

  return parsePossibilityOutput(raw.trim());
}

function parsePossibilityOutput(raw: string): PossibilitySimulationResult {
  const lines = raw.split("\n");
  const lastLine = lines.at(-1)?.trim() ?? "";

  const match = lastLine.match(
    /SIGNAL:\s*(positive|negative|mixed|uncertain)\s*\|\s*CONFIDENCE:\s*(\d+)/i
  );

  if (!match) return { output: raw };

  const outlook = match[1].toLowerCase() as PossibilitySimulationResult["outlook"];
  const confidence = Math.min(100, Math.max(0, parseInt(match[2], 10)));
  const output = lines.slice(0, -1).join("\n").trim();

  return { output, confidence, outlook };
}
