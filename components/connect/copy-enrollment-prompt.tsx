"use client";

import { useState } from "react";
import { CLAUDE_ENROLLMENT_PROMPT } from "@/lib/claude/enrollment-prompt";

export function CopyEnrollmentPrompt({ compact = false }: { compact?: boolean }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(CLAUDE_ENROLLMENT_PROMPT);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      window.setTimeout(() => setCopyState("idle"), 2400);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={
        compact
          ? "shrink-0 rounded-lg border border-[#17171a]/10 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#514f59] transition duration-300 hover:border-[#8f85df]/30 hover:text-[#6f6bc9] active:scale-[0.98]"
          : "shrink-0 rounded-full bg-[#17171a] px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#303036] active:scale-[0.98]"
      }
      aria-live="polite"
    >
      {copyState === "copied"
        ? "Copied"
        : copyState === "error"
          ? "Copy failed"
          : compact
            ? "Copy"
            : "Copy enrollment message"}
    </button>
  );
}
