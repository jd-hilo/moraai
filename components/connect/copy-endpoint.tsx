"use client";

import { useCopyText } from "@/components/connect/use-copy-text";

export function CopyEndpoint({
  endpoint,
  compact = false,
}: {
  endpoint: string;
  compact?: boolean;
}) {
  const { copy, copyState } = useCopyText(endpoint);

  return (
    <button
      type="button"
      onClick={copy}
      className={
        compact
          ? "shrink-0 rounded-lg border border-[#17171a]/10 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em] text-[#514f59] transition duration-300 hover:border-[#8f85df]/30 hover:text-[#6f6bc9] active:scale-[0.98]"
          : "shrink-0 rounded-full bg-[#20201e] px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[#353531] active:scale-[0.98]"
      }
      aria-live="polite"
    >
      {copyState === "copied"
        ? "Copied"
        : copyState === "error"
          ? "Copy failed"
          : compact
            ? "Copy"
            : "Copy endpoint"}
    </button>
  );
}
