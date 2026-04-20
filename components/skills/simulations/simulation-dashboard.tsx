"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type {
  Possibility,
  PossibilityRun,
  PossibilityRunStatus,
  ReportSection,
  SimulationDetail,
  SimulationReport,
  SimulationStatus,
} from "@/lib/skills/simulations/types";

interface Props { simulationId: string }

const POLL_MS = 1500;
const TERMINAL: SimulationStatus[] = ["complete", "failed"];

const STAGES: { statuses: SimulationStatus[]; label: string; step: number }[] = [
  { statuses: ["generating_lenses", "ready_to_run"], label: "Possibilities", step: 1 },
  { statuses: ["running"], label: "Running", step: 2 },
  { statuses: ["generating_report", "complete"], label: "Report", step: 3 },
];
function getStep(status: SimulationStatus): number {
  if (status === "failed") return 0;
  return STAGES.find((s) => (s.statuses as string[]).includes(status))?.step ?? 0;
}

// ─── Avatar palette ────────────────────────────────────────────────────────────
const AVATAR_PALETTE = [
  { skinLight: "#fde8c0", skinDark: "#d4956a", body: "#c4b5fd" },
  { skinLight: "#fcd0aa", skinDark: "#c27a52", body: "#93c5fd" },
  { skinLight: "#f5cba7", skinDark: "#a96b3e", body: "#86efac" },
  { skinLight: "#d4a57a", skinDark: "#8b5e38", body: "#fda4af" },
  { skinLight: "#e8c49a", skinDark: "#b5783c", body: "#fde68a" },
  { skinLight: "#b8855a", skinDark: "#7a4a28", body: "#f0abfc" },
];

// ─── Twin avatar (3D-ish CSS profile icon) ────────────────────────────────────
function TwinAvatar({ idx, size = 22 }: { idx: number; size?: number }) {
  const p = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
  const anims = ["twin-float-a", "twin-float-b", "twin-float-c", "twin-float-d"];
  const anim = anims[idx % 4];
  const dur = 2.4 + (idx % 9) * 0.22;
  const delay = -((idx * 0.37) % dur);
  const headD = size * 0.58;
  const shoulderH = size * 0.5;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        animation: `${anim} ${dur}s ease-in-out ${delay}s infinite`,
        flexShrink: 0,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.18))",
      }}
    >
      {/* Shoulders */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: size * 0.9,
          height: shoulderH,
          borderRadius: `${size * 0.45}px ${size * 0.45}px 0 0`,
          background: `linear-gradient(160deg, ${p.body}, ${p.body}cc)`,
          boxShadow: `0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.25)`,
        }}
      />
      {/* Head */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: headD,
          height: headD,
          borderRadius: "50%",
          background: `radial-gradient(circle at 36% 30%, ${p.skinLight}, ${p.skinDark})`,
          boxShadow: `0 2px 5px rgba(0,0,0,0.22), inset 0 -1px 3px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.35)`,
          zIndex: 1,
        }}
      />
    </div>
  );
}

// ─── Floating avatar keyframes (injected once) ─────────────────────────────────
const AVATAR_STYLE = `
  @keyframes twin-float-a { 0%,100%{transform:translateY(0px) rotate(-1.5deg)} 50%{transform:translateY(-9px) rotate(1.5deg)} }
  @keyframes twin-float-b { 0%,100%{transform:translateY(-5px) rotate(1deg)} 50%{transform:translateY(5px) rotate(-1deg)} }
  @keyframes twin-float-c { 0%,100%{transform:translateY(3px) rotate(0.5deg)} 50%{transform:translateY(-7px) rotate(-0.5deg)} }
  @keyframes twin-float-d { 0%,100%{transform:translateY(-3px) rotate(-0.8deg)} 50%{transform:translateY(7px) rotate(0.8deg)} }
`;

// ─── Allocate N avatars proportionally across possibilities ───────────────────
function allocate100(possibilities: Possibility[], n = 1000): number[] {
  const total = possibilities.reduce((s, p) => s + p.probability, 0) || 100;
  const raw = possibilities.map((p) => (p.probability / total) * n);
  const floors = raw.map(Math.floor);
  const rem = n - floors.reduce((a, b) => a + b, 0);
  // distribute remainder to those with largest fractional parts
  const fracs = raw.map((v, i) => ({ i, f: v - Math.floor(v) }));
  fracs.sort((a, b) => b.f - a.f);
  for (let k = 0; k < rem; k++) floors[fracs[k].i]++;
  return floors;
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function SimulationDashboard({ simulationId }: Props) {
  const [sim, setSim] = useState<SimulationDetail | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    cancelledRef.current = false;
    async function poll() {
      try {
        const res = await fetch(`/api/skills/simulations/${simulationId}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`${res.status}`);
        const data = (await res.json()) as SimulationDetail;
        if (cancelledRef.current) return;
        setSim(data);
        setFetchError(null);
        if (!TERMINAL.includes(data.status)) timerRef.current = setTimeout(poll, POLL_MS);
      } catch (e) {
        if (cancelledRef.current) return;
        setFetchError(String(e));
        timerRef.current = setTimeout(poll, POLL_MS * 2);
      }
    }
    poll();
    return () => { cancelledRef.current = true; if (timerRef.current) clearTimeout(timerRef.current); };
  }, [simulationId]);

  async function startRun() {
    if (!sim || starting) return;
    setStarting(true); setRunError(null);
    try {
      const res = await fetch(`/api/skills/simulations/${simulationId}/run`, { method: "POST" });
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.error || `HTTP ${res.status}`); }
    } catch (e) { setRunError((e as Error).message); }
    finally { setStarting(false); }
  }

  if (fetchError && !sim) return (
    <div style={errorStyle}>
      Failed to load.{" "}
      <Link href="/skills/simulations" style={{ color: "#dc2626", textDecoration: "underline" }}>Back</Link>
    </div>
  );
  if (!sim) return <div style={{ fontSize: 13, color: "#9ca3af", padding: 24 }}>Loading…</div>;

  const step = getStep(sim.status);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
      <style>{AVATAR_STYLE}</style>

      <Link href="/skills/simulations" style={backLink}>← SIMULATIONS</Link>

      {/* Header */}
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 8 }}>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: "#0d0d0d", margin: 0 }}>{sim.title}</h1>
          <StatusBadge status={sim.status} />
        </div>
        <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2, letterSpacing: "0.03em" }}>
          {sim.timeHorizonYears}-year simulation
        </div>
      </div>

      {sim.status !== "failed" && <PipelineBar step={step} status={sim.status} />}

      {/* Generating state — 100 free-floating twins */}
      {sim.status === "generating_lenses" && <GeneratingTwins />}

      {/* Ready — same 100-twin cluster, now ready to run */}
      {sim.status === "ready_to_run" && (
        <ReadyBody sim={sim} starting={starting} onRun={startRun} error={runError} />
      )}

      {/* Running / synthesising / complete */}
      {(sim.status === "running" || sim.status === "generating_report" || sim.status === "complete") && (
        <ActiveBody
          sim={sim}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
        />
      )}

      {sim.status === "failed" && (
        <FailedBody sim={sim} starting={starting} onRetry={startRun} error={runError} />
      )}
    </div>
  );
}

// ─── Generating twins (free-floating cluster) ──────────────────────────────────
function GeneratingTwins() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <SectionLabel>Generating duplicates of your digital twins</SectionLabel>
        <div style={{ fontSize: 12, color: "#9ca3af" }}>Cloning 1,000 versions of you across possible futures…</div>
      </div>
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 4,
        padding: "24px 20px", borderRadius: 12,
        border: "1px solid #f3f4f6", backgroundColor: "#fafafa",
        minHeight: 140,
      }}>
        {Array.from({ length: 1000 }).map((_, i) => (
          <TwinAvatar key={i} idx={i} size={14} />
        ))}
      </div>
    </div>
  );
}

// ─── Ready to run — all 100 twins together ────────────────────────────────────
function ReadyBody({ sim, starting, onRun, error }: {
  sim: SimulationDetail; starting: boolean; onRun: () => void; error: string | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <SectionLabel>1,000 digital twins ready</SectionLabel>
      </div>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 4,
        padding: "24px 20px", borderRadius: 12,
        border: "1px solid #e5e7eb", backgroundColor: "#fafafa",
        minHeight: 140,
      }}>
        {Array.from({ length: 1000 }).map((_, i) => (
          <TwinAvatar key={i} idx={i} size={14} />
        ))}
      </div>

      {error && <div style={errorStyle}>{error}</div>}

      <div>
        <Button variant="primary" disabled={starting} onClick={onRun}>
          {starting ? "Starting…" : "Run simulation"}
        </Button>
      </div>
    </div>
  );
}

// ─── Active (running / synthesising / complete) ───────────────────────────────
function ActiveBody({ sim, expandedId, setExpandedId }: {
  sim: SimulationDetail; expandedId: string | null; setExpandedId: (id: string | null) => void;
}) {
  const runMap = useMemo(() => {
    const m = new Map<string, PossibilityRun>();
    for (const r of sim.runs) m.set(r.possibilityId, r);
    return m;
  }, [sim.runs]);

  const complete = sim.runs.filter((r) => r.status === "complete");
  const failed = sim.runs.filter((r) => r.status === "failed");
  const total = sim.possibilities.length;
  const done = complete.length + failed.length;
  const avgConf = complete.length > 0
    ? Math.round(complete.filter((r) => r.confidence !== undefined).reduce((s, r) => s + (r.confidence ?? 0), 0) / Math.max(1, complete.filter((r) => r.confidence !== undefined).length))
    : null;

  const sorted = [...sim.possibilities].sort((a, b) => b.probability - a.probability);
  const counts = allocate100(sorted);
  let avatarOffset = 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* Progress bar */}
      {sim.status === "running" && (
        <div style={metricBox}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={labelStyle}>{done}/{total} paths explored{failed.length > 0 ? ` · ${failed.length} failed` : ""}</span>
            {avgConf !== null && <span style={labelStyle}>avg confidence {avgConf}%</span>}
          </div>
          <div style={track}><div style={{ ...fill, width: `${(done / Math.max(total, 1)) * 100}%` }} /></div>
        </div>
      )}

      {sim.status === "generating_report" && (
        <div style={{ ...metricBox, display: "flex", alignItems: "center", gap: 10 }}>
          <Spinner />
          <span style={{ fontSize: 13, fontWeight: 500, color: "#0d0d0d" }}>
            Synthesising your career projection across {complete.length} paths…
          </span>
        </div>
      )}

      {/* Career Projection result */}
      {sim.status === "complete" && sim.report && (
        <CareerProjection report={sim.report} sim={sim} possibilities={sim.possibilities} />
      )}

      {/* 100 twin cluster — all together, states driven by 10 agents */}
      {sim.status !== "complete" && (
        <RunningTwinCluster
          possibilities={sim.possibilities}
          runMap={runMap}
        />
      )}

      {/* Collapsible possibility detail on complete */}
      {sim.status === "complete" && (
        <div>
          <SectionLabel style={{ marginBottom: 10 }}>10 Possibilities</SectionLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {sorted.map((p) => (
              <PossibilityCard
                key={p.id}
                possibility={p}
                run={runMap.get(p.id)}
                expanded={expandedId === p.id}
                onToggle={() => setExpandedId(expandedId === p.id ? null : p.id)}
                isTop={sim.report?.topPossibilityId === p.id}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FailedBody({ sim, starting, onRetry, error }: {
  sim: SimulationDetail; starting: boolean; onRetry: () => void; error: string | null;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={errorStyle}>{sim.error || "Simulation failed."}</div>
      {error && <div style={errorStyle}>{error}</div>}
      <div><Button variant="primary" disabled={starting} onClick={onRetry}>{starting ? "Retrying…" : "Retry"}</Button></div>
    </div>
  );
}

// ─── Career Projection result ─────────────────────────────────────────────────
function CareerProjection({ report, sim, possibilities }: {
  report: SimulationReport; sim: SimulationDetail; possibilities: Possibility[];
}) {
  const topP = possibilities.find((p) => p.id === report.topPossibilityId);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ textAlign: "center", paddingBottom: 28, borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.16em", color: "#9ca3af", marginBottom: 12 }}>
          CAREER PROJECTION
        </div>
        <div style={{
          display: "inline-flex", alignItems: "center",
          padding: "4px 16px", borderRadius: 20,
          background: "linear-gradient(135deg, #ede9fe, #ddd6fe)",
          border: "1px solid #c4b5fd",
          fontSize: 11, fontWeight: 700, color: "#7c3aed", letterSpacing: "0.1em",
        }}>
          {sim.timeHorizonYears} YEAR HORIZON
        </div>
      </div>

      {/* Confidence hero */}
      <div style={{ textAlign: "center", padding: "32px 0 28px", borderBottom: "1px solid #f3f4f6" }}>
        <div style={{ fontSize: 68, fontWeight: 700, color: "#0d0d0d", letterSpacing: "-0.05em", lineHeight: 1 }}>
          {report.overallConfidence}%
        </div>
        <div style={{ fontSize: 10, color: "#9ca3af", marginTop: 6, letterSpacing: "0.12em" }}>OVERALL CONFIDENCE</div>
        {topP && (
          <div style={{ fontSize: 14, color: "#374151", marginTop: 14, fontWeight: 400 }}>
            Most likely path: <strong style={{ color: "#0d0d0d" }}>{topP.title}</strong>
            <span style={{ color: "#9ca3af", marginLeft: 6 }}>({topP.probability}%)</span>
          </div>
        )}
      </div>

      {/* Verdict */}
      <div style={{ padding: "28px 0", borderBottom: "1px solid #f3f4f6" }}>
        <SectionLabel>Projection</SectionLabel>
        <div style={{ fontSize: 16, color: "#0d0d0d", lineHeight: 1.75, fontWeight: 400 }}>
          {report.verdict}
        </div>
      </div>

      {/* Summary */}
      <div style={{ padding: "28px 0", borderBottom: "1px solid #f3f4f6" }}>
        <SectionLabel>Analysis</SectionLabel>
        <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.8 }}>{report.summary}</div>
      </div>

      {/* Outcomes — timeline rail */}
      <div style={{ padding: "28px 0", borderBottom: "1px solid #f3f4f6" }}>
        <SectionLabel>Outcomes</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {report.outcomes.points.map((point, i) => (
            <div key={i} style={{ display: "flex", gap: 16, paddingBottom: i < report.outcomes.points.length - 1 ? 20 : 0 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16, flexShrink: 0 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                  background: "linear-gradient(135deg, #c4b5fd, #818cf8)",
                  boxShadow: "0 0 0 3px rgba(167,139,250,0.18)",
                }} />
                {i < report.outcomes.points.length - 1 && (
                  <div style={{
                    width: 1, flex: 1, marginTop: 5,
                    background: "linear-gradient(to bottom, #c4b5fd, #ede9fe)",
                    minHeight: 20,
                  }} />
                )}
              </div>
              <div style={{ fontSize: 14, color: "#1f2937", lineHeight: 1.65, paddingTop: 0 }}>{point}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Risks */}
      <div style={{ padding: "28px 0", borderBottom: "1px solid #f3f4f6" }}>
        <SectionLabel>Risk Factors</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {report.risks.points.map((point, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                backgroundColor: "#fca5a5", flexShrink: 0, marginTop: 7,
                boxShadow: "0 0 0 3px rgba(252,165,165,0.2)",
              }} />
              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.65 }}>{point}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div style={{ padding: "28px 0" }}>
        <SectionLabel>Key Insights</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {report.insights.points.map((point, i) => (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                width: 6, height: 6, borderRadius: "50%",
                backgroundColor: "#6ee7b7", flexShrink: 0, marginTop: 7,
                boxShadow: "0 0 0 3px rgba(110,231,183,0.2)",
              }} />
              <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.65 }}>{point}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── 100 twin cluster during active run ───────────────────────────────────────
// Each of the 10 agents "owns" ~100 twins. Their state tints that slice:
//   pending  → normal
//   running  → pulsing amber ring
//   complete → dimmed green tint
//   failed   → dimmed red tint
function RunningTwinCluster({
  possibilities,
  runMap,
}: {
  possibilities: Possibility[];
  runMap: Map<string, PossibilityRun>;
}) {
  const sorted = [...possibilities].sort((a, b) => b.probability - a.probability);
  const counts = allocate100(sorted, 1000);

  // Build a flat array of 1000 { idx, agentStatus } entries
  const twins: { avatarIdx: number; status: PossibilityRunStatus }[] = [];
  sorted.forEach((p, gi) => {
    const run = runMap.get(p.id);
    const status: PossibilityRunStatus = run?.status ?? "pending";
    for (let ai = 0; ai < counts[gi]; ai++) {
      twins.push({ avatarIdx: twins.length, status });
    }
  });

  const doneCount = sorted.filter((p) => {
    const s = runMap.get(p.id)?.status;
    return s === "complete" || s === "failed";
  }).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
        <SectionLabel style={{ marginBottom: 0 }}>1,000 digital twins running</SectionLabel>
        <span style={{ fontSize: 11, color: "#9ca3af" }}>{doneCount}/10 agents done</span>
      </div>

      <div style={{
        display: "flex", flexWrap: "wrap", gap: 3,
        padding: "20px", borderRadius: 12,
        border: "1px solid #e5e7eb", backgroundColor: "#fafafa",
      }}>
        {twins.map(({ avatarIdx, status }) => (
          <div
            key={avatarIdx}
            style={{
              position: "relative",
              opacity: status === "complete" ? 0.45 : status === "failed" ? 0.3 : 1,
              transition: "opacity 0.4s ease",
            }}
          >
            {status === "running" && (
              <span style={{
                position: "absolute", inset: -3, borderRadius: "50%",
                border: "1.5px solid #f59e0b",
                animation: "mora-pulse 1s ease-in-out infinite",
                zIndex: 0,
              }} />
            )}
            {status === "complete" && (
              <span style={{
                position: "absolute", inset: -2, borderRadius: "50%",
                backgroundColor: "rgba(22,163,74,0.15)",
              }} />
            )}
            <TwinAvatar idx={avatarIdx} size={12} />
          </div>
        ))}
      </div>

      {/* Agent legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {sorted.map((p, gi) => {
          const run = runMap.get(p.id);
          const status: PossibilityRunStatus = run?.status ?? "pending";
          return (
            <div key={p.id} style={{
              display: "flex", alignItems: "center", gap: 5,
              padding: "4px 10px", borderRadius: 20,
              border: "1px solid #e5e7eb",
              backgroundColor: status === "complete" ? "#f0fdf4" : status === "running" ? "#fffbeb" : "#fff",
              fontSize: 11,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
                backgroundColor: status === "complete" ? "#16a34a" : status === "running" ? "#f59e0b" : status === "failed" ? "#dc2626" : "#d1d5db",
                animation: status === "running" ? "mora-pulse 1s ease-in-out infinite" : undefined,
              }} />
              <span style={{ color: "#374151", fontWeight: 500 }}>Agent {gi + 1}</span>
              <span style={{ color: "#9ca3af" }}>· {counts[gi]} twins</span>
              {run?.confidence !== undefined && (
                <span style={{ color: "#6b7280", marginLeft: 2 }}>{run.confidence}%</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Possibility card (complete view) ─────────────────────────────────────────
function PossibilityCard({ possibility, run, expanded, onToggle, isTop = false }: {
  possibility: Possibility; run: PossibilityRun | undefined;
  expanded: boolean; onToggle: () => void; isTop?: boolean;
}) {
  const status = run?.status ?? "idle";
  const canExpand = status === "complete" || status === "failed" || status === "idle";

  return (
    <div
      onClick={() => canExpand && onToggle()}
      style={{
        ...card, cursor: canExpand ? "pointer" : "default",
        borderColor: isTop ? "#0d0d0d" : "#e5e7eb",
        borderWidth: isTop ? 1.5 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#0d0d0d", lineHeight: 1.35, flex: 1 }}>
          {possibility.title}
          {isTop && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, color: "#0d0d0d", border: "1px solid #0d0d0d", padding: "1px 5px", borderRadius: 3, letterSpacing: "0.05em", verticalAlign: "middle" }}>TOP</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {run && <RunBadge status={run.status} />}
          <span style={{ fontSize: 10, fontWeight: 700, color: "#6b7280" }}>{possibility.probability}%</span>
        </div>
      </div>
      <div style={{ fontSize: 11, color: "#6b7280", lineHeight: 1.5, marginBottom: run?.confidence !== undefined ? 8 : 0 }}>
        {possibility.description}
      </div>
      {run?.confidence !== undefined && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <ConfBar value={run.confidence} width={64} height={3} />
          <span style={{ fontSize: 10, color: "#6b7280" }}>{run.confidence}%</span>
        </div>
      )}
      {expanded && status === "complete" && run?.output && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f3f4f6", fontSize: 13, color: "#1f2937", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
          {run.output}
        </div>
      )}
      {expanded && status === "failed" && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#dc2626" }}>{run?.error || "This path failed to run."}</div>
      )}
    </div>
  );
}

// ─── Atoms ────────────────────────────────────────────────────────────────────
function SectionLabel({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, ...style }}>
      {children}
    </div>
  );
}

function ConfBar({ value, width, height }: { value: number; width: number; height: number }) {
  const color = value >= 70 ? "#16a34a" : value >= 45 ? "#ca8a04" : "#dc2626";
  return (
    <div style={{ width, height, borderRadius: height, backgroundColor: "#f3f4f6", overflow: "hidden", flexShrink: 0 }}>
      <div style={{ height: "100%", width: `${value}%`, backgroundColor: color, transition: "width 0.4s ease", borderRadius: height }} />
    </div>
  );
}

function RunBadge({ status }: { status: PossibilityRunStatus }) {
  const map: Record<PossibilityRunStatus, { label: string; color: string; pulse?: boolean }> = {
    pending: { label: "PENDING", color: "#9ca3af" },
    running: { label: "RUNNING", color: "#ca8a04", pulse: true },
    complete: { label: "DONE", color: "#16a34a" },
    failed: { label: "FAILED", color: "#dc2626" },
  };
  const s = map[status];
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color: s.color, display: "inline-flex", alignItems: "center", gap: 3 }}>
      {s.pulse && <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: s.color, animation: "mora-pulse 1s ease-in-out infinite" }} />}
      {s.label}
    </span>
  );
}

function StatusBadge({ status }: { status: SimulationStatus }) {
  const map: Record<SimulationStatus, { label: string; color: string }> = {
    pending: { label: "PENDING", color: "#9ca3af" },
    generating_lenses: { label: "PREP", color: "#ca8a04" },
    ready_to_run: { label: "READY", color: "#1d4ed8" },
    running: { label: "RUNNING", color: "#ca8a04" },
    generating_report: { label: "SYNTH", color: "#ca8a04" },
    complete: { label: "COMPLETE", color: "#16a34a" },
    failed: { label: "FAILED", color: "#dc2626" },
  };
  const s = map[status];
  return (
    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: s.color, border: `1px solid ${s.color}`, padding: "3px 7px", borderRadius: 4, whiteSpace: "nowrap", flexShrink: 0, alignSelf: "flex-start", marginTop: 3 }}>
      {s.label}
    </span>
  );
}

function Spinner() {
  return (
    <span style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #e5e7eb", borderTopColor: "#0d0d0d", display: "inline-block", animation: "mora-spin 0.7s linear infinite", flexShrink: 0 }} />
  );
}

// ─── Style tokens ─────────────────────────────────────────────────────────────
const backLink: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#9ca3af", textDecoration: "none", letterSpacing: "0.06em" };
const pipelineBar: React.CSSProperties = { display: "flex", alignItems: "center", padding: "12px 18px", borderRadius: 8, backgroundColor: "#f9fafb", border: "1px solid #e5e7eb" };
const dot: React.CSSProperties = { width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const card: React.CSSProperties = { padding: "12px 14px", borderRadius: 8, border: "1px solid #e5e7eb", backgroundColor: "#fff", display: "flex", flexDirection: "column", transition: "border-color 0.12s" };
const metricBox: React.CSSProperties = { padding: "14px 16px", borderRadius: 8, border: "1px solid #e5e7eb", backgroundColor: "#f9fafb" };
const labelStyle: React.CSSProperties = { fontSize: 10, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.07em" };
const track: React.CSSProperties = { height: 3, borderRadius: 3, backgroundColor: "#e5e7eb", overflow: "hidden" };
const fill: React.CSSProperties = { height: "100%", backgroundColor: "#0d0d0d", borderRadius: 3, transition: "width 0.3s ease" };
const errorStyle: React.CSSProperties = { padding: "10px 14px", borderRadius: 6, background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626", fontSize: 13 };

// PipelineBar inline (needs dot/labelStyle from tokens above)
function PipelineBar({ step, status }: { step: number; status: SimulationStatus }) {
  const isSpinning = (s: number) => step === s && status !== "ready_to_run" && status !== "complete";
  return (
    <div style={pipelineBar}>
      {STAGES.map((stage, i) => {
        const done = step > stage.step;
        const active = step === stage.step;
        return (
          <React.Fragment key={stage.step}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ ...dot, backgroundColor: done || active ? "#0d0d0d" : "#e5e7eb", position: "relative" }}>
                {done ? (
                  <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                    <path d="M1.5 4.5l2 2 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <>
                    {isSpinning(stage.step) && (
                      <span style={{ position: "absolute", inset: -2, borderRadius: "50%", border: "2px solid #0d0d0d", borderTopColor: "transparent", animation: "mora-spin 0.8s linear infinite" }} />
                    )}
                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: active ? "#fff" : "#9ca3af" }} />
                  </>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: active || done ? 700 : 400, color: active || done ? "#0d0d0d" : "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {stage.label}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <div style={{ flex: 1, height: 1, backgroundColor: done ? "#0d0d0d" : "#e5e7eb", margin: "0 10px" }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
