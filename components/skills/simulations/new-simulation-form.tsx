"use client";

import { useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./simulations.module.css";

const HORIZONS = [1, 3, 5, 10] as const;
const EXAMPLES = [
  "I leave my job to work on my company full-time",
  "I move to a new city",
  "I ask for a promotion",
  "I go back to school",
];

export function NewSimulationForm() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [scenario, setScenario] = useState("");
  const [years, setYears] = useState<number>(5);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = scenario.trim().length > 0 && !submitting;

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/skills/simulations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario: scenario.trim(), timeHorizonYears: years }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body?.error || `Mora could not create this simulation (${response.status})`);
      }
      const data = await response.json();
      if (!data?.id) throw new Error("Mora created the simulation but did not return its location");
      router.push(`/skills/simulations/${data.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  }

  return (
    <form className={styles.form} onSubmit={(event) => { event.preventDefault(); void submit(); }}>
      <div className={styles.fieldGroup}>
        <label className={styles.label} htmlFor="simulation-scenario">Scenario</label>
        <p className={styles.helper} id="simulation-scenario-help">
          Write it as a choice you could make. Specific scenarios lead to more useful paths.
        </p>
        <textarea
          ref={textareaRef}
          id="simulation-scenario"
          className={styles.textarea}
          value={scenario}
          onChange={(event) => setScenario(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="For example: I leave my current role and build my company full-time."
          rows={5}
          aria-describedby="simulation-scenario-help"
          aria-invalid={Boolean(error)}
          autoFocus
          required
        />
        {!scenario && (
          <div className={styles.suggestions} aria-label="Scenario examples">
            {EXAMPLES.map((example) => (
              <button
                className={styles.suggestion}
                key={example}
                type="button"
                onClick={() => {
                  setScenario(example);
                  textareaRef.current?.focus();
                }}
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </div>

      <fieldset className={styles.fieldGroup}>
        <legend className={styles.label}>Time horizon</legend>
        <p className={styles.helper}>How far ahead should Mora follow each path?</p>
        <div className={styles.horizonGroup}>
          {HORIZONS.map((horizon) => (
            <button
              className={`${styles.horizonButton} ${horizon === years ? styles.horizonSelected : ""}`}
              key={horizon}
              type="button"
              aria-pressed={horizon === years}
              onClick={() => setYears(horizon)}
            >
              {horizon} {horizon === 1 ? "year" : "years"}
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <div className={styles.inlineError} role="alert">
          <AlertIcon />
          <span>{error}. Your scenario is still here, so you can try again.</span>
        </div>
      )}

      <div className={styles.formFooter}>
        <span className={styles.keyboardHint}>Command or Control + Enter to run</span>
        <button className={styles.primaryAction} type="submit" disabled={!canSubmit}>
          {submitting ? (
            <><span className={styles.spinner} aria-hidden="true" />Creating simulation</>
          ) : (
            <>Build ten paths <ArrowIcon /></>
          )}
        </button>
      </div>
    </form>
  );
}

function AlertIcon() {
  return (
    <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 4.7v3.8M8 11.2v.1M8 14.2A6.2 6.2 0 1 0 8 1.8a6.2 6.2 0 0 0 0 12.4Z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
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
