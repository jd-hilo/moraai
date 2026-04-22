"use client";

import React, { useState } from "react";
import type { MemoryUpdate, MemoryUpdateChange } from "@/lib/vault/types";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  memoryUpdate?: MemoryUpdate;
  isStreaming?: boolean;
  isMemoryLoading?: boolean;
}

// Render a plain string segment, optionally splitting into word-spans that
// fade in as they mount (used for streaming assistant messages).
function renderSegment(
  text: string,
  bold: boolean,
  baseKey: string,
  animated: boolean
): React.ReactNode[] {
  if (!animated) {
    return [
      bold ? (
        <strong key={baseKey} style={{ fontWeight: 600 }}>
          {text}
        </strong>
      ) : (
        <React.Fragment key={baseKey}>{text}</React.Fragment>
      ),
    ];
  }

  // Split into words keeping whitespace, so each word gets its own fade span.
  const tokens = text.split(/(\s+)/).filter((t) => t !== "");
  return tokens.map((token, i) => {
    const key = `${baseKey}-${i}`;
    const content = bold ? <strong style={{ fontWeight: 600 }}>{token}</strong> : token;
    return (
      <span
        key={key}
        style={{
          animation: "mora-word-fade 0.5s ease-out both",
          display: "inline",
        }}
      >
        {content}
      </span>
    );
  });
}

function renderContent(text: string, animated: boolean): React.ReactNode {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts: React.ReactNode[] = [];
    const boldRegex = /\*\*(.+?)\*\*/g;
    let lastIndex = 0;
    let match;
    let segIdx = 0;

    while ((match = boldRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          ...renderSegment(
            line.slice(lastIndex, match.index),
            false,
            `${i}-${segIdx++}`,
            animated
          )
        );
      }
      parts.push(...renderSegment(match[1], true, `${i}-${segIdx++}`, animated));
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < line.length) {
      parts.push(
        ...renderSegment(line.slice(lastIndex), false, `${i}-${segIdx++}`, animated)
      );
    }

    if (parts.length === 0) {
      parts.push(<React.Fragment key={`${i}-empty`}>{line}</React.Fragment>);
    }

    return (
      <React.Fragment key={i}>
        {parts}
        {i < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}


function MemoryDiffPanel({ changes }: { changes: MemoryUpdateChange[] }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "calc(100% + 8px)",
        right: 0,
        width: 320,
        maxHeight: 360,
        overflowY: "auto",
        background: "#fff",
        border: "1px solid rgba(139,92,246,0.15)",
        borderRadius: 10,
        boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
        fontSize: 12,
        zIndex: 50,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "8px 12px", borderBottom: "1px solid rgba(0,0,0,0.05)", color: "#7c3aed", fontWeight: 500, fontSize: 11, letterSpacing: "0.02em" }}>
        {changes.length === 1 ? "1 memory change" : `${changes.length} memory changes`}
      </div>
      {changes.map((c, i) => (
        <div key={i} style={{ padding: "8px 12px", borderBottom: i < changes.length - 1 ? "1px solid rgba(0,0,0,0.05)" : "none" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: c.diff ? 5 : 0 }}>
            <span style={{
              fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
              padding: "1px 5px", borderRadius: 4,
              ...(c.action === "create" ? { background: "#dcfce7", color: "#166534" }
                : c.action === "update" ? { background: "#dbeafe", color: "#1e40af" }
                : { background: "#fef3c7", color: "#92400e" }),
            }}>{c.action}</span>
            <span style={{ fontFamily: "ui-monospace, Menlo, monospace", color: "#555", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
              {c.filepath}{c.section && <span style={{ color: "#999" }}> › {c.section}</span>}
            </span>
          </div>
          {c.diff && (
            <div style={{ borderRadius: 5, overflow: "hidden", border: "1px solid rgba(0,0,0,0.06)" }}>
              {c.diff.before && (
                <div style={{ display: "flex", gap: 6, padding: "4px 7px", background: "rgba(239,68,68,0.07)", color: "#991b1b", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10, lineHeight: 1.5 }}>
                  <span style={{ opacity: 0.5, userSelect: "none" }}>−</span>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", font: "inherit" }}>{c.diff.before}</pre>
                </div>
              )}
              <div style={{ display: "flex", gap: 6, padding: "4px 7px", background: "rgba(34,197,94,0.08)", color: "#166534", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 10, lineHeight: 1.5 }}>
                <span style={{ opacity: 0.5, userSelect: "none" }}>+</span>
                <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", font: "inherit" }}>{c.diff.after}</pre>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

const KEYFRAMES = `
  @keyframes mora-think-breathe {
    0%, 100% { opacity: 0.15; transform: scale(0.8); }
    50% { opacity: 0.7; transform: scale(1.1); }
  }
  @keyframes mora-word-fade {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes mora-memory-pulse {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 1; }
  }
`;

function MoraOrbIcon({ size = 18, pulse = false }: { size?: number; pulse?: boolean }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: "radial-gradient(circle at 38% 38%, #ffc6e1 0%, #efb6ef 28%, #c6a6f0 55%, #8f85df 85%, #6f6bc9 100%)",
        boxShadow: "0 0 8px rgba(180,140,240,0.5), 0 0 3px rgba(255,180,220,0.4)",
        flexShrink: 0,
        animation: pulse ? "mora-memory-pulse 1.8s ease-in-out infinite" : "none",
        cursor: "inherit",
      }}
    />
  );
}

function AssistantContent({
  content, animated, isMemoryLoading, hasMemoryChanges,
  memoryExpanded, onMemoryToggle, memoryChanges,
}: {
  content: string;
  animated: boolean;
  isMemoryLoading: boolean;
  hasMemoryChanges: boolean;
  memoryExpanded: boolean;
  onMemoryToggle: () => void;
  memoryChanges: import("@/lib/vault/types").MemoryUpdateChange[];
}) {
  const showMemoryIcon = isMemoryLoading || hasMemoryChanges;
  return (
    <div style={{ position: "relative", flex: 1, paddingBottom: showMemoryIcon ? 26 : 0 }}>
      <style>{KEYFRAMES}</style>
      <div style={{ color: "#0d0d0d", fontSize: "15px", lineHeight: 1.7, fontWeight: 400 }}>
        {animated && content === "" ? (
          <span style={{ display: "inline-flex", gap: 5, alignItems: "center", paddingTop: 2 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                display: "inline-block", width: 5, height: 5, borderRadius: "50%",
                background: "radial-gradient(circle at 40% 40%, #efb6ef, #8f85df)",
                animation: `mora-think-breathe 2.4s ease-in-out ${i * 0.4}s infinite`,
              }} />
            ))}
          </span>
        ) : (
          renderContent(content, animated)
        )}
      </div>
      {showMemoryIcon && (
        <div style={{ position: "absolute", bottom: 0, right: 0 }}>
          <div style={{ position: "relative", display: "inline-block" }}>
            <button
              type="button"
              onClick={hasMemoryChanges ? onMemoryToggle : undefined}
              title={isMemoryLoading ? "Updating memory…" : "Memory updated"}
              style={{ background: "none", border: "none", padding: 0, cursor: hasMemoryChanges ? "pointer" : "default", lineHeight: 0 }}
            >
              <MoraOrbIcon size={16} pulse={isMemoryLoading} />
            </button>
            {memoryExpanded && hasMemoryChanges && (
              <MemoryDiffPanel changes={memoryChanges} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function MessageBubble({ role, content, memoryUpdate, isStreaming, isMemoryLoading }: MessageBubbleProps) {
  const isUser = role === "user";
  const animated = !isUser && !!isStreaming;
  const [memoryExpanded, setMemoryExpanded] = useState(false);

  const hasMemoryChanges = !!(memoryUpdate && memoryUpdate.changes.length > 0);

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: isUser ? "flex-end" : "flex-start",
          alignItems: "flex-start",
          marginBottom: "24px",
          padding: "0 16px",
          maxWidth: "768px",
          width: "100%",
          margin: "0 auto 24px",
        }}
      >
        {/* Message content */}
        {isUser ? (
          // User bubble: right-aligned pill with #f4f4f4 background
          <div
            style={{
              marginLeft: "auto",
              maxWidth: "70%",
              backgroundColor: "#f4f4f4",
              color: "#0d0d0d",
              borderRadius: "18px",
              padding: "12px 16px",
              fontSize: "15px",
              lineHeight: 1.7,
              fontWeight: 400,
            }}
          >
            {renderContent(content, false)}
          </div>
        ) : (
          <AssistantContent
            content={content}
            animated={animated}
            isMemoryLoading={!!isMemoryLoading}
            hasMemoryChanges={hasMemoryChanges}
            memoryExpanded={memoryExpanded}
            onMemoryToggle={() => setMemoryExpanded((v) => !v)}
            memoryChanges={memoryUpdate?.changes ?? []}
          />
        )}
      </div>
    </>
  );
}

