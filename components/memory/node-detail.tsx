"use client";

import React from "react";
import type { GraphNode } from "@/lib/vault/types";

const TYPE_COLORS: Record<string, string> = {
  identity: "#8b5cf6",
  people: "#ec4899",
  goals: "#3b82f6",
  patterns: "#f59e0b",
  life: "#14b8a6",
  decisions: "#6b7280",
  unknown: "#9ca3af",
};

interface NodeDetailProps {
  node: GraphNode | null;
  allNodes: GraphNode[];
  onClose: () => void;
  onNodeSelect: (node: GraphNode) => void;
}

export function NodeDetail({ node, allNodes, onClose, onNodeSelect }: NodeDetailProps) {
  if (!node) return null;

  const color = TYPE_COLORS[node.type] || TYPE_COLORS.unknown;

  const connectedNodes = allNodes.filter((n) => node.links.includes(n.id));

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "transparent",
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: "60%",
          backgroundColor: "#fff",
          borderTopLeftRadius: "16px",
          borderTopRightRadius: "16px",
          border: "1px solid rgba(0,0,0,0.08)",
          borderBottom: "none",
          padding: "20px",
          overflow: "auto",
          boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
          animation: "slideUp 0.25s ease",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 28,
            height: 28,
            borderRadius: "50%",
            border: "none",
            backgroundColor: "rgba(0,0,0,0.04)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "14px",
            color: "#888",
          }}
        >
          {"\u2715"}
        </button>

        {/* Title and type badge */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <h3
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "#1a1a1a",
              letterSpacing: "-0.01em",
            }}
          >
            {node.label}
          </h3>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 500,
              color: color,
              backgroundColor: `${color}15`,
              padding: "2px 8px",
              borderRadius: "10px",
            }}
          >
            {node.type}
          </span>
        </div>

        {/* Content */}
        <p
          style={{
            fontSize: "14px",
            lineHeight: 1.6,
            color: "#444",
            marginBottom: "16px",
          }}
        >
          {node.content}
        </p>

        {/* Tags */}
        {node.tags.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginBottom: "16px",
            }}
          >
            {node.tags.map((tag) => (
              <span
                key={tag}
                style={{
                  fontSize: "11px",
                  color: "#888",
                  backgroundColor: "rgba(0,0,0,0.04)",
                  padding: "2px 8px",
                  borderRadius: "8px",
                }}
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Connected nodes */}
        {connectedNodes.length > 0 && (
          <div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "#bbb",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "8px",
              }}
            >
              Connected to
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {connectedNodes.map((linked) => (
                <button
                  key={linked.id}
                  onClick={() => onNodeSelect(linked)}
                  style={{
                    fontSize: "13px",
                    color: TYPE_COLORS[linked.type] || "#888",
                    backgroundColor: `${TYPE_COLORS[linked.type] || "#888"}10`,
                    border: `1px solid ${TYPE_COLORS[linked.type] || "#888"}30`,
                    padding: "4px 12px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {linked.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Last updated */}
        {node.updated && (
          <div
            style={{
              fontSize: "11px",
              color: "#bbb",
              marginTop: "16px",
            }}
          >
            Last updated: {node.updated}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
