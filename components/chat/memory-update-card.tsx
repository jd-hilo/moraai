"use client";

import React, { useState } from "react";
import type { MemoryUpdate } from "@/lib/vault/types";

interface Props {
  /** When null/undefined, shows the "updating memory..." shimmer. */
  update?: MemoryUpdate | null;
  /** Hide the card entirely when true (e.g. after user dismisses) */
  hidden?: boolean;
}

/**
 * Sticky card shown above the chat feed while Mora is updating her memory,
 * then morphs into an "Edited Memory" summary with an expandable diff.
 */
export function MemoryUpdateCard({ update, hidden }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (hidden || dismissed) return null;

  const isLoading = !update;
  const changes = update?.changes ?? [];
  const headline = isLoading ? "Updating memory" : "Edited Memory";
  const durationLabel = update
    ? update.durationMs >= 1000
      ? `${(update.durationMs / 1000).toFixed(1)}s`
      : `${update.durationMs}ms`
    : null;

  return (
    <>
      <style>{memoryCardStyles}</style>
      <div className="mora-mem-card" data-loading={isLoading ? "true" : "false"}>
        <button
          type="button"
          className="mora-mem-card-header"
          onClick={() => !isLoading && setExpanded((v) => !v)}
          disabled={isLoading}
        >
          <span className="mora-mem-card-icon">
            {isLoading ? (
              <span className="mora-mem-spinner" aria-hidden />
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 2l3 6 6 1-4.5 4.5L18 20l-6-3-6 3 1.5-6.5L3 9l6-1 3-6z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </span>

          <span className="mora-mem-title">
            {headline}
            {!isLoading && changes.length > 0 && (
              <span className="mora-mem-count">
                {changes.length === 1 ? "1 change" : `${changes.length} changes`}
              </span>
            )}
          </span>

          {durationLabel && <span className="mora-mem-duration">{durationLabel}</span>}

          {!isLoading && (
            <span className="mora-mem-chevron" data-expanded={expanded ? "true" : "false"}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}

          {!isLoading && (
            <span
              className="mora-mem-close"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                setDismissed(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  setDismissed(true);
                }
              }}
              aria-label="Dismiss memory update"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
          )}
        </button>

        {isLoading && (
          <div className="mora-mem-shimmer-row">
            <div className="mora-mem-shimmer" style={{ width: "72%" }} />
            <div className="mora-mem-shimmer" style={{ width: "44%" }} />
          </div>
        )}

        {!isLoading && expanded && changes.length > 0 && (
          <div className="mora-mem-body">
            {changes.map((c, i) => (
              <div key={i} className="mora-mem-change">
                <div className="mora-mem-change-head">
                  <span className={`mora-mem-action mora-mem-action-${c.action}`}>
                    {c.action}
                  </span>
                  <span className="mora-mem-path">
                    {c.filepath}
                    {c.section ? <span className="mora-mem-section"> › {c.section}</span> : null}
                  </span>
                </div>

                {c.diff && (
                  <div className="mora-mem-diff">
                    {c.diff.before && (
                      <div className="mora-mem-diff-line mora-mem-diff-before">
                        <span className="mora-mem-diff-marker">−</span>
                        <pre>{c.diff.before}</pre>
                      </div>
                    )}
                    <div className="mora-mem-diff-line mora-mem-diff-after">
                      <span className="mora-mem-diff-marker">+</span>
                      <pre>{c.diff.after}</pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

const memoryCardStyles = `
.mora-mem-card {
  position: sticky;
  top: 8px;
  z-index: 40;
  margin: 8px auto 12px;
  width: min(640px, calc(100% - 32px));
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: saturate(140%) blur(10px);
  -webkit-backdrop-filter: saturate(140%) blur(10px);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 12px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.05);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif;
  color: #1a1a1a;
  animation: mora-mem-slide-in 260ms cubic-bezier(.2,.8,.2,1);
  overflow: hidden;
}
.mora-mem-card[data-loading="true"] {
  background: linear-gradient(90deg, rgba(139,92,246,0.05), rgba(236,72,153,0.05), rgba(59,130,246,0.05));
  background-size: 200% 100%;
  animation: mora-mem-slide-in 260ms cubic-bezier(.2,.8,.2,1),
             mora-mem-gradient-shift 3.5s ease-in-out infinite;
}
@keyframes mora-mem-slide-in {
  from { opacity: 0; transform: translateY(-6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes mora-mem-gradient-shift {
  0%, 100% { background-position: 0% 50%; }
  50%      { background-position: 100% 50%; }
}
.mora-mem-card-header {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 14px;
  background: transparent;
  border: 0;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
}
.mora-mem-card-header:disabled { cursor: default; }
.mora-mem-card-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px; height: 22px;
  border-radius: 6px;
  background: linear-gradient(135deg, #8b5cf6, #ec4899, #3b82f6);
  color: #fff;
  flex: 0 0 auto;
}
.mora-mem-spinner {
  display: inline-block;
  width: 12px; height: 12px;
  border: 2px solid rgba(255,255,255,0.35);
  border-top-color: #fff;
  border-radius: 50%;
  animation: mora-mem-spin 720ms linear infinite;
}
@keyframes mora-mem-spin { to { transform: rotate(360deg); } }
.mora-mem-title {
  flex: 1;
  display: flex;
  align-items: baseline;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
}
.mora-mem-count {
  font-size: 12px;
  font-weight: 400;
  color: #888;
}
.mora-mem-duration {
  font-size: 11px;
  color: #aaa;
  font-variant-numeric: tabular-nums;
}
.mora-mem-chevron {
  display: inline-flex;
  color: #888;
  transition: transform 180ms ease;
}
.mora-mem-chevron[data-expanded="true"] { transform: rotate(180deg); }
.mora-mem-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px; height: 22px;
  border-radius: 6px;
  color: #aaa;
  cursor: pointer;
  transition: background 120ms, color 120ms;
}
.mora-mem-close:hover { background: rgba(0,0,0,0.05); color: #555; }
.mora-mem-shimmer-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 0 14px 12px;
}
.mora-mem-shimmer {
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.12) 40%, rgba(0,0,0,0.05) 80%);
  background-size: 200% 100%;
  animation: mora-mem-shimmer 1.4s ease-in-out infinite;
}
@keyframes mora-mem-shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.mora-mem-body {
  border-top: 1px solid rgba(0,0,0,0.06);
  padding: 10px 14px 12px;
  animation: mora-mem-expand 180ms ease;
}
@keyframes mora-mem-expand {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.mora-mem-change + .mora-mem-change { margin-top: 10px; }
.mora-mem-change-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #555;
}
.mora-mem-action {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 2px 6px;
  border-radius: 4px;
}
.mora-mem-action-create { background: #dcfce7; color: #166534; }
.mora-mem-action-update { background: #dbeafe; color: #1e40af; }
.mora-mem-action-append { background: #fef3c7; color: #92400e; }
.mora-mem-path {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  color: #333;
}
.mora-mem-section { color: #888; }
.mora-mem-diff {
  margin-top: 6px;
  border: 1px solid rgba(0,0,0,0.06);
  border-radius: 8px;
  overflow: hidden;
  background: #fafafa;
}
.mora-mem-diff-line {
  display: flex;
  gap: 8px;
  padding: 6px 10px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 12px;
  line-height: 1.45;
}
.mora-mem-diff-before { background: rgba(239,68,68,0.07); color: #991b1b; }
.mora-mem-diff-after  { background: rgba(34,197,94,0.08); color: #166534; }
.mora-mem-diff-marker {
  opacity: 0.7;
  user-select: none;
  flex: 0 0 auto;
}
.mora-mem-diff-line pre {
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font: inherit;
}
`;
