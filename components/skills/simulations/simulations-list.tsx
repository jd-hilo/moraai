"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import type {
  SimulationStatus,
  SimulationSummary,
} from "@/lib/skills/simulations/types";

export function SimulationsList() {
  const [sims, setSims] = useState<SimulationSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/skills/simulations")
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        setSims(d.simulations ?? []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div style={{ color: "#991b1b", fontSize: 14 }}>
        Couldn&apos;t load simulations ({error})
      </div>
    );
  }

  if (sims === null) {
    return <div style={{ color: "#6e6e80", fontSize: 14 }}>Loading…</div>;
  }

  if (sims.length === 0) {
    return (
      <div
        style={{
          padding: 48,
          textAlign: "center",
          border: "1px dashed #e5e5e5",
          borderRadius: 16,
          backgroundColor: "#fafafa",
        }}
      >
        <div style={{ fontSize: 16, fontWeight: 500, color: "#0d0d0d", marginBottom: 6 }}>
          No simulations yet
        </div>
        <div style={{ fontSize: 14, color: "#6e6e80", marginBottom: 20 }}>
          Describe a what-if scenario and Mora will run it through 10 lenses
          drawn from your life.
        </div>
        <Link href="/skills/simulations/new" style={{ textDecoration: "none" }}>
          <Button variant="primary">New simulation</Button>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {sims.map((s) => (
        <Link
          key={s.id}
          href={`/skills/simulations/${s.id}`}
          style={{
            textDecoration: "none",
            color: "inherit",
            display: "block",
            padding: "16px 18px",
            borderRadius: 12,
            border: "1px solid #e5e5e5",
            backgroundColor: "#fff",
            transition: "background-color 0.15s, border-color 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#fafafa";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "#fff";
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 4,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 500, color: "#0d0d0d", flex: 1, minWidth: 0 }}>
              {s.title}
            </div>
            <StatusPill status={s.status} />
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#6e6e80",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {s.scenario}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "#9ca3af",
              marginTop: 6,
            }}
          >
            {s.timeHorizonYears} year{s.timeHorizonYears === 1 ? "" : "s"} •{" "}
            {new Date(s.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            })}
          </div>
        </Link>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: SimulationStatus }) {
  const map: Record<SimulationStatus, { label: string; bg: string; fg: string }> = {
    pending: { label: "Pending", bg: "#f3f4f6", fg: "#6b7280" },
    generating_lenses: { label: "Identifying lenses", bg: "#fef3c7", fg: "#92400e" },
    ready_to_run: { label: "Ready", bg: "#dbeafe", fg: "#1e40af" },
    running: { label: "Running", bg: "#fef3c7", fg: "#92400e" },
    generating_report: { label: "Synthesizing", bg: "#fef3c7", fg: "#92400e" },
    complete: { label: "Complete", bg: "#dcfce7", fg: "#166534" },
    failed: { label: "Failed", bg: "#fee2e2", fg: "#991b1b" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        padding: "3px 8px",
        borderRadius: 12,
        backgroundColor: s.bg,
        color: s.fg,
        whiteSpace: "nowrap",
      }}
    >
      {s.label}
    </span>
  );
}
