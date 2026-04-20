"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const HORIZONS = [1, 3, 5, 10] as const;
const EXAMPLES = [
  "I quit my job to work on my startup full-time",
  "I move to a new city",
  "I ask for a promotion",
  "I end my current relationship",
  "I go back to school",
];

export function NewSimulationForm() {
  const router = useRouter();
  const [scenario, setScenario] = useState("");
  const [years, setYears] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSubmit = scenario.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/skills/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenario.trim(), timeHorizonYears: years }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b?.error || `Error ${res.status}`);
      }
      const data = await res.json();
      if (!data?.id) throw new Error("No id returned");
      router.push(`/skills/simulations/${data.id}`);
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600 }}>
      {/* Scenario input */}
      <div style={inputWrap}>
        <textarea
          ref={textareaRef}
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What would you like to simulate? e.g. I quit my job to do my startup full-time"
          rows={3}
          autoFocus
          style={textarea}
        />

        {/* Example chips — visible only when empty */}
        {scenario.length === 0 && (
          <div style={{ padding: "0 14px 12px", display: "flex", flexWrap: "wrap", gap: 6 }}>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => { setScenario(ex); textareaRef.current?.focus(); }}
                style={exampleChip}
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Time horizon + submit on the same row */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {HORIZONS.map((y) => (
          <button
            key={y}
            type="button"
            onClick={() => setYears(y)}
            style={{
              ...horizonBtn,
              backgroundColor: y === years ? "#0d0d0d" : "#fff",
              color: y === years ? "#fff" : "#0d0d0d",
              borderColor: y === years ? "#0d0d0d" : "#e5e7eb",
            }}
          >
            {y}y
          </button>
        ))}

        <div style={{ flex: 1 }} />

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          style={{
            ...runBtn,
            opacity: canSubmit ? 1 : 0.45,
            cursor: canSubmit ? "pointer" : "not-allowed",
          }}
        >
          {submitting ? "Creating…" : "Run →"}
        </button>
      </div>

      {/* Hint */}
      <div style={{ fontSize: 11, color: "#9ca3af" }}>
        ⌘ + Enter to run · Mora generates 10 possibilities automatically
      </div>

      {error && (
        <div style={{ padding: "10px 14px", borderRadius: 6, background: "rgba(220,38,38,0.07)", border: "1px solid rgba(220,38,38,0.2)", color: "#dc2626", fontSize: 13 }}>
          {error}
        </div>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const inputWrap: React.CSSProperties = {
  borderRadius: 10,
  border: "1px solid #e5e7eb",
  backgroundColor: "#fff",
  overflow: "hidden",
  transition: "border-color 0.15s",
};

const textarea: React.CSSProperties = {
  width: "100%",
  padding: "14px 16px 10px",
  border: "none",
  outline: "none",
  fontSize: 15,
  lineHeight: 1.6,
  fontFamily: "'DM Sans', sans-serif",
  color: "#0d0d0d",
  backgroundColor: "transparent",
  resize: "none",
  boxSizing: "border-box",
};

const exampleChip: React.CSSProperties = {
  fontSize: 11,
  color: "#6b7280",
  backgroundColor: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: 20,
  padding: "3px 10px",
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  transition: "background-color 0.12s, color 0.12s",
  whiteSpace: "nowrap",
};

const horizonBtn: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: "7px 14px",
  borderRadius: 20,
  border: "1px solid",
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  transition: "all 0.12s",
  letterSpacing: "0.02em",
};

const runBtn: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  padding: "9px 22px",
  borderRadius: 20,
  border: "none",
  backgroundColor: "#0d0d0d",
  color: "#fff",
  fontFamily: "'DM Sans', sans-serif",
  transition: "opacity 0.15s",
  letterSpacing: "0.01em",
};
