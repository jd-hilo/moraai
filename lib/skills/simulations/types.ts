/**
 * Types for the Simulations skill — shared by API routes, pipelines, and UI.
 */

/**
 * A possibility is one distinct trajectory the scenario could take.
 * Generated from the user's context + scenario — NOT a relationship lens.
 */
export interface Possibility {
  id: string;
  /** Short title — "The Rapid Growth Path", "The Slow Burn", "The Pivot" */
  title: string;
  /** 2–3 sentence description of how this path plays out. */
  description: string;
  /** Estimated probability this path occurs — 0 to 100. All 10 should sum to ~100. */
  probability: number;
}

export type PossibilityRunStatus = "pending" | "running" | "complete" | "failed";

export interface PossibilityRun {
  possibilityId: string;
  status: PossibilityRunStatus;
  /** Full narrative output for this possibility. */
  output: string;
  /** 0–100 calibrated confidence this trajectory holds. Parsed from model response. */
  confidence?: number;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ReportSection {
  title: string;
  points: string[];
}

export interface SimulationReport {
  /** 1–2 sentence matter-of-fact prediction of the most likely outcome. */
  verdict: string;
  /** 0–100 aggregate confidence across all possibilities. */
  overallConfidence: number;
  /** ID of the possibility most likely to occur. */
  topPossibilityId: string;
  /** 1–2 paragraph summary. */
  summary: string;
  outcomes: ReportSection;
  risks: ReportSection;
  insights: ReportSection;
}

export type SimulationStatus =
  | "pending"
  | "generating_lenses"
  | "ready_to_run"
  | "running"
  | "generating_report"
  | "complete"
  | "failed";

/** Full simulation returned from GET /api/skills/simulations/[id] */
export interface SimulationDetail {
  id: string;
  title: string;
  scenario: string;
  narrative: string | null;
  timeHorizonYears: number;
  status: SimulationStatus;
  possibilities: Possibility[];
  runs: PossibilityRun[];
  report: SimulationReport | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Shape of each row in GET /api/skills/simulations */
export interface SimulationSummary {
  id: string;
  title: string;
  scenario: string;
  timeHorizonYears: number;
  status: SimulationStatus;
  createdAt: string;
  updatedAt: string;
}

export const POSSIBILITY_COUNT = 10;

/** @deprecated use POSSIBILITY_COUNT */
export const LENS_COUNT = POSSIBILITY_COUNT;
