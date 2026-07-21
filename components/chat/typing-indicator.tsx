"use client";

import React from "react";

export function TypingIndicator() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        marginBottom: "24px",
        padding: "0 16px",
        maxWidth: "768px",
        width: "100%",
        margin: "0 auto 24px",
      }}
    >
      {/* Small dreamy orb avatar */}
      <div
        style={{
          width: 18,
          height: 18,
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 38%, #f8d6cf 0%, #e4b8a6 30%, #e4b5d3 62%, #e87a7f 100%)",
          boxShadow:
            "0 0 10px rgba(180, 140, 240, 0.55), 0 0 4px rgba(255, 180, 220, 0.5), inset 0 0 3px rgba(255, 220, 240, 0.5)",
          flexShrink: 0,
          marginTop: 3,
        }}
      />

      {/* Three static dots — no bubble */}
      <div style={{ display: "flex", gap: "5px", alignItems: "center", paddingTop: 2 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: "#0d0d0d",
              opacity: 0.3 + i * 0.25,
            }}
          />
        ))}
      </div>
    </div>
  );
}
