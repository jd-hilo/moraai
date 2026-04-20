"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";

interface ProcessingScreenProps {
  messages: string[];
  isComplete: boolean;
}

const ORB_GRADIENT =
  "radial-gradient(circle at 38% 38%, #ffc6e1 0%, #efb6ef 28%, #c6a6f0 55%, #8f85df 85%, #6f6bc9 100%)";

/* ── Translate raw pipeline messages into human-friendly ones ─────── */
function friendlyMessage(raw: string): string {
  if (raw.includes("Done. I know you now")) return "Done. I know you now.";
  if (raw.includes("Writing to storage"))   return "Saving your vault securely…";
  if (raw.includes("Generated"))            return "Assembling your memory map…";
  if (raw.includes("Building your memory")) return "Building your personal memory vault…";
  if (raw.includes("Hello,"))              return `Merged your memories. ${raw.split("Hello,")[1].trim().replace(".", "")} — nice to meet you.`;
  if (raw.includes("Merged into"))         return "Shaping your unique memory profile…";
  if (raw.includes("Merging duplicates"))  return "Identifying patterns and removing duplicates…";
  if (raw.includes("Extracting knowledge from batch")) {
    const match = raw.match(/batch (\d+)\/(\d+)/);
    if (match) return `Reading through your conversations… (${match[1]} of ${match[2]})`;
  }
  if (raw.includes("Processing") && raw.includes("batches")) {
    const match = raw.match(/(\d+) batches/);
    return match ? `Organising ${match[1]} groups of conversations…` : "Organising your conversations…";
  }
  if (raw.includes("Found") && raw.includes("conversations")) {
    const match = raw.match(/(\d+) conversations/);
    return match ? `Found ${match[1]} conversations — sit tight, this may take a minute.` : "Found your conversations…";
  }
  if (raw.includes("Starting import")) return "Reading your conversation history…";
  if (raw.includes("Something went wrong")) return "Something went wrong. Please try again.";
  return raw;
}

/* ── Derive 0-100 progress from the raw message stream ───────────── */
function deriveProgress(messages: string[], isComplete: boolean): number {
  if (isComplete) return 100;
  if (messages.length === 0) return 0;

  const last = messages[messages.length - 1];

  if (last.includes("Done"))              return 100;
  if (last.includes("Writing to storage")) return 92;
  if (last.includes("Generated"))         return 86;
  if (last.includes("Building your"))     return 80;
  if (last.includes("Hello,") || last.includes("Merged into")) return 74;
  if (last.includes("Merging duplicates") || last.includes("Extracted")) return 68;

  if (last.includes("Extracting knowledge from batch")) {
    const match = last.match(/batch (\d+)\/(\d+)/);
    if (match) {
      const n = parseInt(match[1]);
      const total = parseInt(match[2]);
      // batches span 14% → 68%
      return Math.round(14 + (n / total) * 54);
    }
  }

  if (last.includes("Processing") && last.includes("batches")) return 14;
  if (last.includes("Found"))   return 8;
  if (last.includes("Starting")) return 3;

  return 5;
}

export function ProcessingScreen({ messages, isComplete }: ProcessingScreenProps) {
  const targetProgress = deriveProgress(messages, isComplete);
  const lastRaw = messages[messages.length - 1] ?? "";
  const currentMessage = friendlyMessage(lastRaw);

  // Smoothly animate toward the target, but never go backwards.
  // During the long extraction phase (14–68%) we creep forward automatically
  // so the bar never looks frozen.
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    setDisplayProgress(prev => Math.max(prev, targetProgress));
  }, [targetProgress]);

  // Auto-creep: while we're in the extraction window (14–67%), inch forward
  // every 800ms so the bar visibly moves even when there are no new messages.
  useEffect(() => {
    if (isComplete) return;
    const id = setInterval(() => {
      setDisplayProgress(prev => {
        // Only creep if we're in the "extraction" zone and haven't hit the
        // next real milestone yet.
        if (prev >= 14 && prev < 67) {
          return Math.min(prev + 0.8, 67);
        }
        return prev;
      });
    }, 800);
    return () => clearInterval(id);
  }, [isComplete]);

  // Orbiting dot angle for the loading animation
  const [angle, setAngle] = useState(0);
  useEffect(() => {
    if (isComplete) return;
    const id = setInterval(() => setAngle(a => (a + 2) % 360), 16);
    return () => clearInterval(id);
  }, [isComplete]);

  const rad = (angle * Math.PI) / 180;
  const r = 44;
  const dotX = Math.cos(rad) * r;
  const dotY = Math.sin(rad) * r;

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "40px 24px",
      background: "linear-gradient(180deg, #fafaf8 0%, #f5f0ff 60%, #fafaf8 100%)",
      position: "relative",
    }}>
      <style>{`
        @keyframes orb-breathe {
          0%, 100% { transform: scale(1); box-shadow: 0 0 24px rgba(180,140,240,0.45), 0 0 8px rgba(255,180,220,0.5); }
          50%       { transform: scale(1.06); box-shadow: 0 0 40px rgba(180,140,240,0.65), 0 0 16px rgba(255,180,220,0.6); }
        }
        @keyframes msg-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Ambient glow */}
      <div aria-hidden style={{
        position: "fixed", top: "10%", left: "50%", transform: "translateX(-50%)",
        width: "80vw", height: "60vh",
        background: "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(198,166,240,0.35) 0%, rgba(255,198,225,0.2) 55%, transparent 80%)",
        filter: "blur(32px)", pointerEvents: "none", zIndex: 0,
      }} />

      {/* Logo */}
      <div style={{ position: "absolute", top: 20, left: 28, zIndex: 1 }}>
        <Image src="/mora-logo.png" alt="Mora" width={100} height={32} style={{ height: 28, width: "auto" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 440, textAlign: "center" }}>

        {/* Orb with orbiting dot */}
        <div style={{
          position: "relative",
          width: 100, height: 100,
          margin: "0 auto 32px",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: ORB_GRADIENT,
            animation: isComplete ? "none" : "orb-breathe 2.4s ease-in-out infinite",
            boxShadow: "0 0 24px rgba(180,140,240,0.45), 0 0 8px rgba(255,180,220,0.5)",
          }} />
          {!isComplete && (
            <div style={{
              position: "absolute",
              left: "50%", top: "50%",
              transform: `translate(calc(-50% + ${dotX}px), calc(-50% + ${dotY}px))`,
              width: 8, height: 8, borderRadius: "50%",
              background: "radial-gradient(circle, #ffc6e1, #8f85df)",
              boxShadow: "0 0 6px rgba(180,140,240,0.8)",
            }} />
          )}
        </div>

        {/* Headline */}
        <h2 style={{
          fontFamily: "'Recoleta', 'DM Sans', serif",
          fontSize: 28, fontWeight: 400,
          color: "#0d0d0d", letterSpacing: "-0.025em",
          margin: "0 0 8px",
        }}>
          {isComplete ? "I know you now." : "Getting to know you…"}
        </h2>

        {/* Current status */}
        <p
          key={currentMessage}
          style={{
            fontSize: 15, color: "#6b6b7a", lineHeight: 1.55,
            margin: "0 0 32px",
            animation: "msg-in 0.4s ease",
            minHeight: 24,
          }}
        >
          {currentMessage}
        </p>

        {/* Progress bar */}
        <div style={{
          height: 6, borderRadius: 3,
          background: "rgba(0,0,0,0.06)",
          overflow: "hidden",
          marginBottom: 12,
        }}>
          <div style={{
            height: "100%",
            width: `${displayProgress}%`,
            borderRadius: 3,
            background: "linear-gradient(90deg, #8f85df, #c6a6f0, #ffc6e1)",
            transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }} />
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between",
          fontSize: 12, color: "#aaa", marginBottom: 32,
        }}>
          <span>{isComplete ? "Complete" : "Processing…"}</span>
          <span>{displayProgress}%</span>
        </div>

        {/* Do not close warning */}
        {!isComplete && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "8px 16px", borderRadius: 999,
            background: "rgba(245,158,11,0.08)",
            border: "1px solid rgba(245,158,11,0.2)",
            fontSize: 12, color: "#92670a",
          }}>
            <span>⚠️</span>
            Please don&apos;t close this tab — your vault is being built.
          </div>
        )}
      </div>
    </div>
  );
}
