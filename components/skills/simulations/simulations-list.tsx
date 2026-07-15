"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type {
  SimulationStatus,
  SimulationSummary,
} from "@/lib/skills/simulations/types";
import styles from "./simulations.module.css";

export function SimulationsList() {
  const [simulations, setSimulations] = useState<SimulationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [requestKey, setRequestKey] = useState(0);

  const loadSimulations = useCallback(async (signal: AbortSignal) => {
    setError(null);
    try {
      const response = await fetch("/api/skills/simulations", { signal });
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
      const data = await response.json();
      setSimulations(data.simulations ?? []);
    } catch (reason) {
      if (signal.aborted) return;
      setError(reason instanceof Error ? reason.message : "Something went wrong");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadSimulations(controller.signal);
    return () => controller.abort();
  }, [loadSimulations, requestKey]);

  if (error && simulations === null) {
    return (
      <div className={`${styles.statePanel} ${styles.errorPanel}`} role="alert">
        <span className={styles.stateMark} aria-hidden="true"><AlertIcon /></span>
        <div>
          <h2 className={styles.stateTitle}>Simulations could not be loaded</h2>
          <p className={styles.stateCopy}>{error}. Check your connection and try again.</p>
        </div>
        <button className={styles.retryButton} type="button" onClick={() => setRequestKey((key) => key + 1)}>
          Try again
        </button>
      </div>
    );
  }

  if (simulations === null) return <SimulationListSkeleton />;

  if (simulations.length === 0) {
    return (
      <section className={styles.statePanel} aria-labelledby="empty-simulations-title">
        <span className={styles.stateMark} aria-hidden="true"><PathsIcon /></span>
        <div>
          <h2 id="empty-simulations-title" className={styles.stateTitle}>Your first paths start here</h2>
          <p className={styles.stateCopy}>
            Bring Mora a decision you are circling, a move you are considering,
            or a change you want to pressure-test.
          </p>
        </div>
        <Link className={styles.secondaryAction} href="/skills/simulations/new">Start a simulation</Link>
      </section>
    );
  }

  return (
    <section aria-labelledby="simulation-history-title">
      <div className={styles.sectionHeader}>
        <h2 id="simulation-history-title" className={styles.sectionTitle}>Your simulations</h2>
        <span className={styles.sectionMeta}>{simulations.length} total</span>
      </div>
      {error && (
        <p className={styles.inlineError} role="status">
          This list may be out of date. Mora will try to reconnect when you open a simulation.
        </p>
      )}
      <ul className={styles.simulationList}>
        {simulations.map((simulation) => (
          <li className={styles.simulationItem} key={simulation.id}>
            <Link className={styles.simulationLink} href={`/skills/simulations/${simulation.id}`}>
              <div>
                <div className={styles.simulationTitleRow}>
                  <span className={styles.simulationTitle}>{simulation.title}</span>
                  <StatusBadge status={simulation.status} />
                </div>
                <p className={styles.simulationScenario}>{simulation.scenario}</p>
              </div>
              <div className={styles.simulationMeta}>
                <span>{formatHorizon(simulation.timeHorizonYears)}</span>
                <span aria-hidden="true">·</span>
                <time dateTime={simulation.createdAt}>
                  {new Date(simulation.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: new Date(simulation.createdAt).getFullYear() === new Date().getFullYear() ? undefined : "numeric",
                  })}
                </time>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SimulationListSkeleton() {
  return (
    <div className={styles.skeletonList} aria-busy="true" aria-label="Loading simulations">
      {[0, 1, 2].map((row) => (
        <div className={styles.skeletonRow} key={row}>
          <div className={styles.skeletonLines}>
            <span className={`${styles.skeletonLine} ${styles.skeletonLineShort}`} />
            <span className={styles.skeletonLine} />
          </div>
          <span className={`${styles.skeletonLine} ${styles.skeletonMeta}`} />
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: SimulationStatus }) {
  const statuses: Record<SimulationStatus, { label: string; className: string }> = {
    pending: { label: "Pending", className: styles.statusNeutral },
    generating_lenses: { label: "Finding paths", className: styles.statusPending },
    ready_to_run: { label: "Ready", className: styles.statusAccent },
    running: { label: "Running", className: styles.statusPending },
    generating_report: { label: "Synthesizing", className: styles.statusPending },
    complete: { label: "Complete", className: styles.statusSuccess },
    failed: { label: "Needs attention", className: styles.statusError },
  };
  const value = statuses[status] ?? statuses.pending;
  return <span className={`${styles.statusBadge} ${value.className}`}>{value.label}</span>;
}

function formatHorizon(years: number) {
  return `${years}-year horizon`;
}

function AlertIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
      <path d="M8.5 5v4M8.5 12.2v.1M8.5 15.2a6.7 6.7 0 1 0 0-13.4 6.7 6.7 0 0 0 0 13.4Z" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function PathsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M3 3.2v3.1c0 1.5 1.2 2.7 2.7 2.7h6.6M8.9 5.7 12.3 9l-3.4 3.3M3 14.8v-2.2" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
