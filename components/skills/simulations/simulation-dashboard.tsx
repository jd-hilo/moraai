"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import type {
  Possibility,
  PossibilityRun,
  PossibilityRunStatus,
  ReportSection,
  SimulationDetail,
  SimulationReport,
  SimulationStatus,
} from "@/lib/skills/simulations/types";
import styles from "./simulations.module.css";

interface Props {
  simulationId: string;
}

const POLL_MS = 1500;
const TERMINAL_STATUSES: SimulationStatus[] = ["complete", "failed"];
const STAGES: { statuses: SimulationStatus[]; label: string }[] = [
  { statuses: ["pending", "generating_lenses", "ready_to_run"], label: "Build paths" },
  { statuses: ["running"], label: "Explore" },
  { statuses: ["generating_report", "complete"], label: "Synthesize" },
];

export function SimulationDashboard({ simulationId }: Props) {
  const [simulation, setSimulation] = useState<SimulationDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const poll = useCallback(async (signal: AbortSignal) => {
    try {
      const response = await fetch(`/api/skills/simulations/${simulationId}`, {
        cache: "no-store",
        signal,
      });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const data = (await response.json()) as SimulationDetail;
      if (signal.aborted) return;
      setSimulation(data);
      setFetchError(null);
      if (!TERMINAL_STATUSES.includes(data.status)) {
        timerRef.current = setTimeout(() => void poll(signal), POLL_MS);
      }
    } catch (reason) {
      if (signal.aborted) return;
      setFetchError(reason instanceof Error ? reason.message : "Something went wrong");
      timerRef.current = setTimeout(() => void poll(signal), POLL_MS * 2);
    }
  }, [simulationId]);

  useEffect(() => {
    const controller = new AbortController();
    void poll(controller.signal);
    return () => {
      controller.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [poll, refreshKey]);

  async function startRun() {
    if (!simulation || starting) return;
    setStarting(true);
    setRunError(null);
    try {
      const response = await fetch(`/api/skills/simulations/${simulationId}/run`, { method: "POST" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `Mora could not start the simulation (${response.status})`);
      }
      setRefreshKey((key) => key + 1);
    } catch (reason) {
      setRunError(reason instanceof Error ? reason.message : "Something went wrong");
    } finally {
      setStarting(false);
    }
  }

  if (fetchError && !simulation) {
    return (
      <>
        <SimulationBreadcrumb />
        <div className={`${styles.statePanel} ${styles.errorPanel}`} role="alert">
          <span className={styles.stateMark} aria-hidden="true"><AlertIcon /></span>
          <div>
            <h1 className={styles.stateTitle}>This simulation could not be loaded</h1>
            <p className={styles.stateCopy}>{fetchError}. Check your connection and try again.</p>
          </div>
          <button className={styles.retryButton} type="button" onClick={() => setRefreshKey((key) => key + 1)}>
            Try again
          </button>
        </div>
      </>
    );
  }

  if (!simulation) return <DashboardSkeleton />;

  const stageIndex = getStageIndex(simulation.status);

  return (
    <div className={styles.dashboard}>
      <SimulationBreadcrumb />

      <header className={styles.dashboardHeader}>
        <div>
          <p className={styles.eyebrow}>Simulation</p>
          <h1 className={styles.dashboardTitle}>{simulation.title}</h1>
          <p className={styles.dashboardScenario}>{simulation.scenario}</p>
          <p className={styles.dashboardMeta}>{simulation.timeHorizonYears}-year horizon</p>
        </div>
        <StatusBadge status={simulation.status} />
      </header>

      {simulation.status !== "failed" && <Pipeline activeIndex={stageIndex} status={simulation.status} />}

      {fetchError && (
        <div className={styles.inlineError} role="status">
          <AlertIcon />
          <span>Live updates paused. Mora is reconnecting automatically.</span>
        </div>
      )}

      {(simulation.status === "pending" || simulation.status === "generating_lenses") && (
        <PreparingPaths />
      )}

      {simulation.status === "ready_to_run" && (
        <ReadyToRun simulation={simulation} starting={starting} error={runError} onRun={startRun} />
      )}

      {(simulation.status === "running" || simulation.status === "generating_report" || simulation.status === "complete") && (
        <ActiveSimulation
          simulation={simulation}
          expandedId={expandedId}
          onToggle={(id) => setExpandedId((current) => current === id ? null : id)}
        />
      )}

      {simulation.status === "failed" && (
        <FailedSimulation simulation={simulation} starting={starting} error={runError} onRetry={startRun} />
      )}
    </div>
  );
}

function SimulationBreadcrumb() {
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <Link className={styles.breadcrumbLink} href="/skills/simulations">Simulations</Link>
      <span className={styles.breadcrumbSeparator} aria-hidden="true">/</span>
      <span aria-current="page">Result</span>
    </nav>
  );
}

function DashboardSkeleton() {
  return (
    <div className={styles.dashboard} aria-busy="true" aria-label="Loading simulation">
      <div className={styles.breadcrumb}><span>Simulations</span><span>/</span><span>Result</span></div>
      <div className={styles.skeletonLines}>
        <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
        <span className={styles.skeletonLine} />
      </div>
      <div className={styles.skeletonList}>
        {[0, 1, 2].map((row) => (
          <div className={styles.skeletonRow} key={row}>
            <div className={styles.skeletonLines}>
              <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
              <span className={styles.skeletonLine} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pipeline({ activeIndex, status }: { activeIndex: number; status: SimulationStatus }) {
  return (
    <ol className={styles.pipeline} aria-label="Simulation progress">
      {STAGES.map((stage, index) => {
        const complete = index < activeIndex || status === "complete";
        const active = index === activeIndex && !complete;
        return (
          <li
            className={`${styles.pipelineStage} ${complete ? styles.pipelineComplete : ""} ${active ? styles.pipelineActive : ""}`}
            key={stage.label}
            aria-current={active ? "step" : undefined}
          >
            <span className={styles.pipelineDot} aria-hidden="true" />
            <span>{stage.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function PreparingPaths() {
  return (
    <section className={styles.processSection} aria-live="polite">
      <div className={styles.processHeader}>
        <div>
          <h2 className={styles.processTitle}>Building distinct future paths</h2>
          <p className={styles.processCopy}>
            Mora is combining your scenario with relevant context from your life,
            then separating it into ten plausible trajectories.
          </p>
        </div>
        <div className={styles.loadingStatus}><span className={styles.spinner} aria-hidden="true" />Preparing</div>
      </div>
      <ActivityField state="generating" />
    </section>
  );
}

function ReadyToRun({ simulation, starting, error, onRun }: {
  simulation: SimulationDetail;
  starting: boolean;
  error: string | null;
  onRun: () => void;
}) {
  return (
    <section className={styles.processSection}>
      <div className={styles.processHeader}>
        <div>
          <h2 className={styles.processTitle}>Ten paths are ready to explore</h2>
          <p className={styles.processCopy}>
            Mora will run each path independently, compare their outcomes, and
            synthesize the result into one report for this {simulation.timeHorizonYears}-year horizon.
          </p>
        </div>
        <button className={styles.primaryAction} type="button" onClick={onRun} disabled={starting}>
          {starting ? <><span className={styles.spinner} aria-hidden="true" />Starting</> : <>Run simulation <ArrowIcon /></>}
        </button>
      </div>
      <ActivityField state="ready" />
      {error && <div className={styles.inlineError} role="alert"><AlertIcon /><span>{error}</span></div>}
    </section>
  );
}

function ActivityField({ state }: { state: "generating" | "ready" }) {
  return (
    <div>
      <div className={`${styles.activityField} ${state === "generating" ? styles.activityGenerating : styles.activityReady}`} aria-hidden="true">
        {Array.from({ length: 100 }, (_, index) => <span className={styles.activityMark} key={index} />)}
      </div>
      <div className={styles.fieldLegend}>
        <span>Each mark represents ten modeled versions</span>
        <span>1,000 versions across 10 paths</span>
      </div>
    </div>
  );
}

function ActiveSimulation({ simulation, expandedId, onToggle }: {
  simulation: SimulationDetail;
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  const runMap = useMemo(() => {
    const map = new Map<string, PossibilityRun>();
    simulation.runs.forEach((run) => map.set(run.possibilityId, run));
    return map;
  }, [simulation.runs]);

  const sortedPossibilities = useMemo(
    () => [...simulation.possibilities].sort((a, b) => b.probability - a.probability),
    [simulation.possibilities],
  );
  const completedRuns = simulation.runs.filter((run) => run.status === "complete");
  const failedRuns = simulation.runs.filter((run) => run.status === "failed");
  const done = completedRuns.length + failedRuns.length;
  const total = simulation.possibilities.length;

  return (
    <div className={styles.processSection}>
      {simulation.status === "running" && (
        <>
          <div className={styles.progressBlock} aria-live="polite">
            <div className={styles.progressMeta}>
              <span>{done} of {total} paths explored</span>
              <span>{failedRuns.length > 0 ? `${failedRuns.length} unavailable` : "Comparing outcomes"}</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ transform: `scaleX(${done / Math.max(total, 1)})` }} />
            </div>
          </div>
          <PathProgress possibilities={sortedPossibilities} runMap={runMap} />
        </>
      )}

      {simulation.status === "generating_report" && (
        <>
          <div className={styles.processHeader} aria-live="polite">
            <div>
              <h2 className={styles.processTitle}>Finding the signal across every path</h2>
              <p className={styles.processCopy}>
                The paths are complete. Mora is comparing their shared outcomes,
                important differences, risks, and confidence levels.
              </p>
            </div>
            <div className={styles.loadingStatus}><span className={styles.spinner} aria-hidden="true" />Synthesizing</div>
          </div>
          <PathProgress possibilities={sortedPossibilities} runMap={runMap} />
        </>
      )}

      {simulation.status === "complete" && simulation.report && (
        <>
          <SimulationReportView report={simulation.report} possibilities={simulation.possibilities} />
          <PossibilityExplorer
            possibilities={sortedPossibilities}
            runMap={runMap}
            topPossibilityId={simulation.report.topPossibilityId}
            expandedId={expandedId}
            onToggle={onToggle}
          />
        </>
      )}

      {simulation.status === "complete" && !simulation.report && (
        <div className={`${styles.statePanel} ${styles.errorPanel}`} role="status">
          <span className={styles.stateMark} aria-hidden="true"><AlertIcon /></span>
          <div>
            <h2 className={styles.stateTitle}>The paths finished, but the report is missing</h2>
            <p className={styles.stateCopy}>Your path results are safe. Refresh this page to check for the synthesis again.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function PathProgress({ possibilities, runMap }: {
  possibilities: Possibility[];
  runMap: Map<string, PossibilityRun>;
}) {
  return (
    <div className={styles.pathProgressList}>
      {possibilities.map((possibility, index) => {
        const run = runMap.get(possibility.id);
        return (
          <div className={styles.pathProgressRow} key={possibility.id}>
            <span className={styles.pathIndex}>{String(index + 1).padStart(2, "0")}</span>
            <span className={styles.pathProgressTitle}>{possibility.title}</span>
            <RunBadge status={run?.status ?? "pending"} />
          </div>
        );
      })}
    </div>
  );
}

function SimulationReportView({ report, possibilities }: {
  report: SimulationReport;
  possibilities: Possibility[];
}) {
  const topPossibility = possibilities.find((possibility) => possibility.id === report.topPossibilityId);
  return (
    <section aria-labelledby="simulation-report-title">
      <div className={styles.reportHero}>
        <div>
          <p className={styles.eyebrow}>Mora synthesis</p>
          <h2 id="simulation-report-title" className={styles.reportVerdict}>{report.verdict}</h2>
          {topPossibility && (
            <p className={styles.topPath}>
              Most likely path: <strong>{topPossibility.title}</strong> at {topPossibility.probability}% likelihood.
            </p>
          )}
        </div>
        <div className={styles.confidenceMetric}>
          <span className={styles.confidenceValue}>{report.overallConfidence}%</span>
          <span className={styles.confidenceLabel}>Overall confidence</span>
        </div>
      </div>
      <ReportTextSection title="Analysis"><p>{report.summary}</p></ReportTextSection>
      <ReportListSection title={report.outcomes.title || "Outcomes"} section={report.outcomes} />
      <ReportListSection title={report.risks.title || "Risks"} section={report.risks} />
      <ReportListSection title={report.insights.title || "Insights"} section={report.insights} />
    </section>
  );
}

function ReportTextSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className={styles.reportSection}>
      <h3 className={styles.reportSectionTitle}>{title}</h3>
      <div className={styles.reportBody}>{children}</div>
    </section>
  );
}

function ReportListSection({ title, section }: { title: string; section: ReportSection }) {
  return (
    <section className={styles.reportSection}>
      <h3 className={styles.reportSectionTitle}>{title}</h3>
      <ul className={`${styles.reportBody} ${styles.reportList}`}>
        {section.points.map((point, index) => <li className={styles.reportListItem} key={index}>{point}</li>)}
      </ul>
    </section>
  );
}

function PossibilityExplorer({ possibilities, runMap, topPossibilityId, expandedId, onToggle }: {
  possibilities: Possibility[];
  runMap: Map<string, PossibilityRun>;
  topPossibilityId: string;
  expandedId: string | null;
  onToggle: (id: string) => void;
}) {
  return (
    <section className={styles.pathsSection} aria-labelledby="possibility-paths-title">
      <div className={styles.pathsHeading}>
        <div>
          <h2 id="possibility-paths-title" className={styles.pathsTitle}>Explore the ten paths</h2>
          <p className={styles.pathsCopy}>Open a path to read its full independent result.</p>
        </div>
        <span className={styles.pathsMeta}>Ordered by likelihood</span>
      </div>
      <div>
        {possibilities.map((possibility, index) => {
          const run = runMap.get(possibility.id);
          const expanded = expandedId === possibility.id;
          const panelId = `path-${possibility.id}`;
          return (
            <article className={styles.pathItem} key={possibility.id}>
              <button
                className={styles.pathButton}
                type="button"
                aria-expanded={expanded}
                aria-controls={panelId}
                onClick={() => onToggle(possibility.id)}
              >
                <span className={styles.pathIndex}>{String(index + 1).padStart(2, "0")}</span>
                <span>
                  <span className={styles.pathTitle}>
                    {possibility.title}
                    {possibility.id === topPossibilityId && <span className={styles.topBadge}>Most likely</span>}
                  </span>
                  <span className={styles.pathDescription}>{possibility.description}</span>
                </span>
                <span className={styles.pathMetrics}>
                  <span>{possibility.probability}% likely</span>
                  {run?.confidence !== undefined && <span>{run.confidence}% confidence</span>}
                </span>
                <ChevronIcon open={expanded} />
              </button>
              {expanded && (
                <div id={panelId} className={`${styles.pathDetail} ${run?.status === "failed" ? styles.pathError : ""}`}>
                  {run?.status === "failed" ? (run.error || "This path could not be completed.") : (run?.output || "This path does not have a result yet.")}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function FailedSimulation({ simulation, starting, error, onRetry }: {
  simulation: SimulationDetail;
  starting: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className={`${styles.statePanel} ${styles.errorPanel}`} role="alert">
      <span className={styles.stateMark} aria-hidden="true"><AlertIcon /></span>
      <div>
        <h2 className={styles.stateTitle}>This simulation stopped before it finished</h2>
        <p className={styles.stateCopy}>{error || simulation.error || "Mora could not complete one of the required stages."}</p>
      </div>
      <button className={styles.retryButton} type="button" onClick={onRetry} disabled={starting}>
        {starting ? "Retrying" : "Try again"}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: SimulationStatus }) {
  const statuses: Record<SimulationStatus, { label: string; className: string }> = {
    pending: { label: "Pending", className: styles.statusNeutral },
    generating_lenses: { label: "Finding paths", className: styles.statusPending },
    ready_to_run: { label: "Ready to run", className: styles.statusAccent },
    running: { label: "Exploring paths", className: styles.statusPending },
    generating_report: { label: "Synthesizing", className: styles.statusPending },
    complete: { label: "Complete", className: styles.statusSuccess },
    failed: { label: "Needs attention", className: styles.statusError },
  };
  const value = statuses[status];
  return <span className={`${styles.statusBadge} ${value.className}`}>{value.label}</span>;
}

function RunBadge({ status }: { status: PossibilityRunStatus }) {
  const statuses: Record<PossibilityRunStatus, { label: string; color: string }> = {
    pending: { label: "Waiting", color: "#92929c" },
    running: { label: "Exploring", color: "#8a641a" },
    complete: { label: "Complete", color: "#26714c" },
    failed: { label: "Unavailable", color: "#9c3a35" },
  };
  const value = statuses[status];
  return (
    <span className={styles.runBadge} style={{ color: value.color }}>
      <span className={styles.runDot} aria-hidden="true" />{value.label}
    </span>
  );
}

function getStageIndex(status: SimulationStatus) {
  return Math.max(0, STAGES.findIndex((stage) => stage.statuses.includes(status)));
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={`${styles.pathChevron} ${open ? styles.pathChevronOpen : ""}`} aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg aria-hidden="true" width="17" height="17" viewBox="0 0 17 17" fill="none">
      <path d="M8.5 5v4M8.5 12.2v.1M8.5 15.2a6.7 6.7 0 1 0 0-13.4 6.7 6.7 0 0 0 0 13.4Z" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
