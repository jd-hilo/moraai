"use client";

import { useEffect, useRef, useState } from "react";

export type CopyState = "idle" | "copied" | "error";

export function useCopyText(text: string) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    []
  );

  async function copy() {
    if (resetTimer.current) clearTimeout(resetTimer.current);

    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      resetTimer.current = setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("error");
      resetTimer.current = setTimeout(() => setCopyState("idle"), 2400);
    }
  }

  return { copy, copyState };
}
