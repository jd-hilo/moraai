"use client";

import type { MouseEvent } from "react";

export function ScrollToSetup() {
  function scrollToSetup(event: MouseEvent<HTMLAnchorElement>) {
    const setup = document.getElementById("install");
    if (!setup) return;

    event.preventDefault();
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const setupTop = setup.getBoundingClientRect().top + window.scrollY;
    const instructionOffset = window.innerWidth >= 768 ? 176 : 120;

    window.scrollTo({
      top: setupTop + instructionOffset,
      behavior: reduceMotion ? "auto" : "smooth",
    });
    window.history.replaceState(null, "", "#install");
  }

  return (
    <a
      href="#install"
      onClick={scrollToSetup}
      className="rounded-full bg-[linear-gradient(135deg,#8f85df_0%,#b69be8_52%,#d69fc8_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_14px_34px_-18px_rgba(111,107,201,0.75),inset_0_1px_0_rgba(255,255,255,0.3)] transition duration-300 hover:-translate-y-0.5 active:-translate-y-px active:scale-[0.98]"
    >
      See the setup
    </a>
  );
}
