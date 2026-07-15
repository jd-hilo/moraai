"use client";

import { useCopyText } from "@/components/connect/use-copy-text";
import { CLAUDE_NIGHTLY_SYNC_PROMPT } from "@/lib/claude/enrollment-prompt";

export function CopyNightlySyncPrompt() {
  const { copy, copyState } = useCopyText(CLAUDE_NIGHTLY_SYNC_PROMPT);

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-full bg-[#17171a] px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#303036] active:scale-[0.98]"
      aria-live="polite"
    >
      {copyState === "copied"
        ? "Copied"
        : copyState === "error"
          ? "Copy failed"
          : "Copy nightly task"}
    </button>
  );
}
