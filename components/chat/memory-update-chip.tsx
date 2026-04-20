"use client";

import React, { useState } from "react";
import type { MemoryUpdate } from "@/lib/vault/types";

interface Props {
  update: MemoryUpdate;
}

/**
 * Small inline chip shown below an assistant message when Mora updated her memory.
 * Only renders when there are actual changes — no shimmer/loading state.
 */
export function MemoryUpdateChip({ update }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { changes, durationMs } = update;

  if (!changes || changes.length === 0) return null;

  const label =
    changes.length === 1 ? "Memory updated · 1 change" : `Memory updated · ${changes.length} changes`;

  const durationLabel =
    durationMs >= 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${durationMs}ms`;

  return (
    <div style={{ padding: "0 16px 8px 52px" }}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          border: "1px solid rgba(139,92,246,0.2)",
          borderRadius: 20,
          background: "rgba(139,92,246,0.05)",
          color: "#7c3aed",
          fontSize: 12,
          fontWeight: 400,
          cursor: "pointer",
          letterSpacing: "-0.01em",
        }}
      >
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1 3-6z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
        {label}
        <span style={{ color: "#a78bfa", fontSize: 11 }}>{durationLabel}</span>
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          style={{
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 160ms ease",
          }}
        >
          <path
            d="M6 9l6 6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {expanded && (
        <div
          style={{
            marginTop: 8,
            border: "1px solid rgba(0,0,0,0.07)",
            borderRadius: 10,
            overflow: "hidden",
            background: "#fff",
            fontSize: 12,
            maxWidth: 520,
          }}
        >
          {changes.map((c, i) => (
            <div
              key={i}
              style={{
                padding: "8px 12px",
                borderBottom:
                  i < changes.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: c.diff ? 6 : 0,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    padding: "2px 6px",
                    borderRadius: 4,
                    ...(c.action === "create"
                      ? { background: "#dcfce7", color: "#166534" }
                      : c.action === "update"
                        ? { background: "#dbeafe", color: "#1e40af" }
                        : { background: "#fef3c7", color: "#92400e" }),
                  }}
                >
                  {c.action}
                </span>
                <span
                  style={{
                    fontFamily: "ui-monospace, Menlo, monospace",
                    color: "#444",
                    fontSize: 11,
                  }}
                >
                  {c.filepath}
                  {c.section && (
                    <span style={{ color: "#999" }}> › {c.section}</span>
                  )}
                </span>
              </div>

              {c.diff && (
                <div
                  style={{
                    borderRadius: 6,
                    overflow: "hidden",
                    border: "1px solid rgba(0,0,0,0.06)",
                  }}
                >
                  {c.diff.before && (
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        padding: "5px 8px",
                        background: "rgba(239,68,68,0.07)",
                        color: "#991b1b",
                        fontFamily: "ui-monospace, Menlo, monospace",
                        fontSize: 11,
                        lineHeight: 1.5,
                      }}
                    >
                      <span style={{ opacity: 0.6, userSelect: "none" }}>−</span>
                      <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", font: "inherit" }}>
                        {c.diff.before}
                      </pre>
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      padding: "5px 8px",
                      background: "rgba(34,197,94,0.08)",
                      color: "#166534",
                      fontFamily: "ui-monospace, Menlo, monospace",
                      fontSize: 11,
                      lineHeight: 1.5,
                    }}
                  >
                    <span style={{ opacity: 0.6, userSelect: "none" }}>+</span>
                    <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", font: "inherit" }}>
                      {c.diff.after}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
