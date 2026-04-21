import { callLLM } from "@/lib/providers/call";
import { buildReportSynthesisPrompt } from "@/lib/prompts/simulations/report-synthesis";
import type {
  Possibility,
  PossibilityRun,
  ReportSection,
  SimulationReport,
} from "@/lib/skills/simulations/types";

export async function generateReport(params: {
  userName: string | null;
  vaultContext: string;
  scenario: string;
  narrative: string;
  lenses: Possibility[];
  runs: PossibilityRun[];
  timeHorizonYears: number;
  userId?: string;
}): Promise<SimulationReport> {
  const prompt = buildReportSynthesisPrompt(
    params.userName,
    params.vaultContext,
    params.scenario,
    params.narrative,
    params.lenses,
    params.runs,
    params.timeHorizonYears
  );

  const orchestratorSystem = "You are a senior career intelligence orchestrator. You have received simulation outputs from 10 digital twin agents who each ran a distinct possible future. Your job is to synthesise their findings into a single authoritative career projection — analytically rigorous, honest, and actionable.";

  // Use Sonnet instead of Opus — Opus is 5x more expensive and the quality
  // delta isn't worth it for this synthesis task. Keeps the per-simulation
  // cost within the $5/week free-tier budget.
  const text = await callLLM({
    anthropicModel: "claude-sonnet-4-6",
    openaiModel: "gpt-4o",
    system: orchestratorSystem,
    prompt,
    maxTokens: 2500,
    userId: params.userId,
    action: "simulation.report",
  });

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error(`Report returned no JSON object: ${text.slice(0, 300)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    throw new Error(`Report JSON failed to parse: ${(err as Error).message}`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Report output was not an object.");
  }

  const r = parsed as Record<string, unknown>;

  return {
    verdict: asString(r.verdict),
    overallConfidence: asConfidence(r.overallConfidence),
    topPossibilityId: asString(r.topPossibilityId),
    summary: asString(r.summary),
    outcomes: asSection(r.outcomes, "Likely Outcomes"),
    risks: asSection(r.risks, "Key Risks"),
    insights: asSection(r.insights, "What the Simulation Reveals"),
  };
}

function asString(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function asConfidence(v: unknown): number {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  if (!Number.isFinite(n)) return 50;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function asSection(v: unknown, fallbackTitle: string): ReportSection {
  if (!v || typeof v !== "object") return { title: fallbackTitle, points: [] };
  const r = v as Record<string, unknown>;
  const title =
    typeof r.title === "string" && r.title.trim() ? r.title.trim() : fallbackTitle;
  const points = (Array.isArray(r.points) ? r.points : [])
    .filter((p): p is string => typeof p === "string")
    .map((p) => p.trim())
    .filter(Boolean);
  return { title, points };
}
