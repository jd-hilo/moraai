"use client";

import { useCopyText } from "@/components/connect/use-copy-text";
import { CLAUDE_MEMORY_MIRROR_INSTRUCTION } from "@/lib/claude/enrollment-prompt";

export function CopyMemoryInstruction() {
  const { copy, copyState } = useCopyText(CLAUDE_MEMORY_MIRROR_INSTRUCTION);

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
          : "Copy Claude instruction"}
    </button>
  );
}
