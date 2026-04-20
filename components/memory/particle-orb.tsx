"use client";

import React, { useRef } from "react";

export interface ParticleOrbProps {
  baseHue?: number;   // 0-360, default 0
  count?: number;     // particle count, default 150
  size?: number;      // orb radius px, default 80
  duration?: number;  // animation seconds, default 14
  label?: string;     // category label below orb
  nodeCount?: number; // shown as "N memories" subtitle
  onClick?: () => void;
  active?: boolean;   // show a faint selection ring
}

export function ParticleOrb({
  baseHue = 0,
  count = 150,
  size = 80,
  duration = 14,
  label,
  nodeCount,
  onClick,
  active = false,
}: ParticleOrbProps) {
  // Stable unique ID per instance
  const uid = useRef<string>(
    `orb-${Math.random().toString(36).slice(2, 9)}`
  ).current;

  // Stable random angles per particle — generated once, never re-randomized
  const angles = useRef<{ z: number; y: number }[]>(
    Array.from({ length: count }, () => ({
      z: Math.floor(Math.random() * 360),
      y: Math.floor(Math.random() * 360),
    }))
  ).current;

  // Build the CSS string
  let css = `
@keyframes ${uid}-rot {
  100% { transform: rotateY(360deg) rotateX(360deg); }
}
`;

  for (let i = 0; i < count; i++) {
    const n = i + 1; // 1-based to match :nth-child
    const { z, y } = angles[i];
    const hue = ((40 / count) * i + baseHue) % 360;
    const delay = (i * 0.01).toFixed(2);

    css += `
.${uid}-p:nth-child(${n}) {
  animation: ${uid}-o${n} ${duration}s ${delay}s infinite;
  background-color: hsla(${hue.toFixed(1)}, 100%, 50%, 1);
}
@keyframes ${uid}-o${n} {
  20%  { opacity: 1; }
  30%  { transform: rotateZ(-${z}deg) rotateY(${y}deg) translateX(${size}px) rotateZ(${z}deg); }
  80%  { transform: rotateZ(-${z}deg) rotateY(${y}deg) translateX(${size}px) rotateZ(${z}deg); opacity: 1; }
  100% { transform: rotateZ(-${z}deg) rotateY(${y}deg) translateX(${size * 3}px) rotateZ(${z}deg); }
}`;
  }

  const containerSize = size * 2 + 80;

  const containerStyle: React.CSSProperties = {
    position: "relative",
    width: containerSize,
    height: containerSize,
    overflow: "visible",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    cursor: onClick ? "pointer" : "default",
    boxShadow: active ? "0 0 0 2px rgba(255,255,255,0.2)" : undefined,
    borderRadius: "50%",
  };

  const wrapStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: 0,
    height: 0,
    transformStyle: "preserve-3d",
    perspective: "1000px",
    animation: `${uid}-rot ${duration}s linear infinite`,
  };

  const particleStyle: React.CSSProperties = {
    position: "absolute",
    width: 2,
    height: 2,
    borderRadius: "50%",
    opacity: 0,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {/* eslint-disable-next-line react/no-danger */}
      <style dangerouslySetInnerHTML={{ __html: css }} />

      <div style={containerStyle} onClick={onClick}>
        <div style={wrapStyle}>
          {Array.from({ length: count }, (_, i) => (
            <div key={i} className={`${uid}-p`} style={particleStyle} />
          ))}
        </div>
      </div>

      {label && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span
            style={{
              color: "rgba(255,255,255,0.7)",
              fontSize: 13,
              textTransform: "capitalize",
              fontFamily: "'DM Sans', -apple-system, sans-serif",
              letterSpacing: "0.01em",
            }}
          >
            {label}
          </span>
          {nodeCount !== undefined && (
            <span
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: 11,
                fontFamily: "'DM Sans', -apple-system, sans-serif",
              }}
            >
              {nodeCount} {nodeCount === 1 ? "memory" : "memories"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
