"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const ORB_GRADIENT =
  "radial-gradient(circle at 38% 38%, #ffc6e1 0%, #efb6ef 28%, #c6a6f0 55%, #8f85df 85%, #6f6bc9 100%)";

function MoraOrb({ size, glow = true }: { size: number; glow?: boolean }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: ORB_GRADIENT,
        boxShadow: glow
          ? "0 0 24px rgba(180,140,240,0.45), 0 0 8px rgba(255,180,220,0.5)"
          : "none",
        flexShrink: 0,
      }}
    />
  );
}

function SparkleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ---------------------------- Memory graph UI ---------------------------- */

interface OrbStyle {
  name: string;
  stops: [string, string, string, string, string];
  halo: string;
  legend: string;
}

const ORB_STYLES: Record<string, OrbStyle> = {
  Lilac:    { name: "Lilac",    stops: ["#ffc6e1", "#efb6ef", "#c6a6f0", "#8f85df", "#6f6bc9"], halo: "rgba(180,140,240,0.45)", legend: "#c6a6f0" },
  Rose:     { name: "Rose",     stops: ["#fff1f5", "#fbcfe8", "#f472b6", "#db2777", "#831843"], halo: "rgba(240,120,180,0.45)", legend: "#f472b6" },
  Dusk:     { name: "Dusk",     stops: ["#ffb3d1", "#d99cf0", "#9b87eb", "#5f6bd9", "#3730a3"], halo: "rgba(120,110,220,0.45)", legend: "#9b87eb" },
  Peach:    { name: "Peach",    stops: ["#fff7ed", "#fed7aa", "#fdba74", "#fb923c", "#c2410c"], halo: "rgba(250,170,110,0.45)", legend: "#fdba74" },
  Mint:     { name: "Mint",     stops: ["#ecfdf5", "#a7f3d0", "#6ee7b7", "#10b981", "#047857"], halo: "rgba(80,200,160,0.45)",  legend: "#6ee7b7" },
  Mist:     { name: "Mist",     stops: ["#f8fafc", "#e2e8f0", "#a1a1aa", "#64748b", "#334155"], halo: "rgba(140,150,170,0.40)", legend: "#a1a1aa" },
};

function orbGradient(style: OrbStyle): string {
  const [c0, c1, c2, c3, c4] = style.stops;
  return `radial-gradient(circle at 38% 35%, ${c0} 0%, ${c1} 25%, ${c2} 55%, ${c3} 82%, ${c4} 100%)`;
}

interface MemoryNode {
  id: string;
  label: string;
  type: keyof typeof ORB_STYLES;
  size: number;
  initialX: number;
  initialY: number;
}

const MEMORY_NODES: MemoryNode[] = [
  { id: "family", label: "Family",    type: "Rose",  size: 28, initialX: 120, initialY: 90  },
  { id: "career", label: "Career",    type: "Dusk",  size: 32, initialX: 340, initialY: 70  },
  { id: "health", label: "Health",    type: "Mint",  size: 24, initialX: 560, initialY: 130 },
  { id: "values", label: "Values",    type: "Lilac", size: 30, initialX: 220, initialY: 240 },
  { id: "habits", label: "Habits",    type: "Peach", size: 22, initialX: 440, initialY: 250 },
  { id: "people", label: "Sam",       type: "Rose",  size: 18, initialX: 650, initialY: 260 },
  { id: "goals",  label: "This year", type: "Mist",  size: 20, initialX: 70,  initialY: 230 },
];

const MEMORY_LINKS: [string, string][] = [
  ["values", "family"],
  ["values", "career"],
  ["career", "habits"],
  ["health", "habits"],
  ["family", "people"],
  ["career", "goals"],
  ["values", "health"],
];

function DraggableOrb({
  node,
  positions,
  onDrag,
}: {
  node: MemoryNode;
  positions: Record<string, { x: number; y: number }>;
  onDrag: (id: string, x: number, y: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const startRef = useRef({ clientX: 0, clientY: 0, x: 0, y: 0 });
  const style = ORB_STYLES[node.type];
  const pos = positions[node.id];

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      onDrag(
        node.id,
        startRef.current.x + (e.clientX - startRef.current.clientX),
        startRef.current.y + (e.clientY - startRef.current.clientY)
      );
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, node.id, onDrag]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    startRef.current = { clientX: e.clientX, clientY: e.clientY, x: pos.x, y: pos.y };
    setDragging(true);
  };

  const outerSize = node.size * 2 + 12;
  const orbSize = node.size * 2;

  return (
    <div
      onPointerDown={onPointerDown}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        width: outerSize,
        height: outerSize + 22,
        transform: "translate(-50%, -50%)",
        cursor: dragging ? "grabbing" : "grab",
        userSelect: "none",
        touchAction: "none",
        zIndex: dragging ? 50 : 2,
      }}
    >
      {/* outer glow ring */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: orbSize / 2 + 6,
          transform: "translate(-50%, -50%)",
          width: outerSize,
          height: outerSize,
          borderRadius: "50%",
          background: style.legend,
          opacity: 0.12,
          pointerEvents: "none",
        }}
      />
      {/* main orb */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: orbSize / 2 + 6,
          transform: "translate(-50%, -50%)",
          width: orbSize,
          height: orbSize,
          borderRadius: "50%",
          background: orbGradient(style),
          border: "2.5px solid #fff",
          boxShadow: `0 2px 8px rgba(0,0,0,0.12), 0 0 14px ${style.halo}`,
          pointerEvents: "none",
        }}
      />
      {/* label */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: orbSize + 18,
          transform: "translateX(-50%)",
          fontSize: 11,
          fontFamily: "'DM Sans', sans-serif",
          color: "#777",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {node.label}
      </div>
    </div>
  );
}

function MemoryGraphDemo() {
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>(() =>
    Object.fromEntries(MEMORY_NODES.map((n) => [n.id, { x: n.initialX, y: n.initialY }]))
  );

  const updatePosition = (id: string, x: number, y: number) => {
    setPositions((p) => ({ ...p, [id]: { x, y } }));
  };

  return (
    <div
      style={{
        position: "relative",
        height: 420,
        borderRadius: 16,
        background: "#fff",
        border: "1px solid rgba(0,0,0,0.06)",
        overflow: "hidden",
        boxShadow: "0 10px 40px rgba(100,90,180,0.06)",
      }}
    >
      {/* legend — matches real vault UI */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          left: 16,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 10,
          zIndex: 5,
        }}
      >
        {Object.entries({
          identity: "Lilac",
          people: "Rose",
          goals: "Dusk",
          patterns: "Peach",
          life: "Mint",
          decisions: "Mist",
        }).map(([type, styleName]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#777" }}>
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: orbGradient(ORB_STYLES[styleName as keyof typeof ORB_STYLES]),
              }}
            />
            {type}
          </div>
        ))}
      </div>

      {/* link lines */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}
      >
        {MEMORY_LINKS.map(([a, b], i) => {
          const pa = positions[a];
          const pb = positions[b];
          if (!pa || !pb) return null;
          return (
            <line
              key={i}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke="rgba(0,0,0,0.07)"
              strokeWidth={1.5}
            />
          );
        })}
      </svg>

      {MEMORY_NODES.map((node) => (
        <DraggableOrb key={node.id} node={node} positions={positions} onDrag={updatePosition} />
      ))}
    </div>
  );
}

/* ------------------------------ Twin avatars ------------------------------ */

const AVATAR_PALETTE = [
  { skinLight: "#fde8c0", skinDark: "#d4956a", body: "#c4b5fd" },
  { skinLight: "#fcd0aa", skinDark: "#c27a52", body: "#93c5fd" },
  { skinLight: "#f5cba7", skinDark: "#a96b3e", body: "#86efac" },
  { skinLight: "#d4a57a", skinDark: "#8b5e38", body: "#fda4af" },
  { skinLight: "#e8c49a", skinDark: "#b5783c", body: "#fde68a" },
  { skinLight: "#b8855a", skinDark: "#7a4a28", body: "#f0abfc" },
];

function TwinAvatar({ idx, size = 18 }: { idx: number; size?: number }) {
  const p = AVATAR_PALETTE[idx % AVATAR_PALETTE.length];
  const anims = ["twin-float-a", "twin-float-b", "twin-float-c", "twin-float-d"];
  const anim = anims[idx % 4];
  const dur = 2.4 + (idx % 9) * 0.22;
  const delay = -((idx * 0.37) % dur);
  const headD = size * 0.58;
  const shoulderH = size * 0.5;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        animation: `${anim} ${dur}s ease-in-out ${delay}s infinite`,
        flexShrink: 0,
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.18))",
      }}
    >
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: size * 0.9,
          height: shoulderH,
          borderRadius: `${size * 0.45}px ${size * 0.45}px 0 0`,
          background: `linear-gradient(160deg, ${p.body}, ${p.body}cc)`,
          boxShadow: "0 2px 6px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.25)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: headD,
          height: headD,
          borderRadius: "50%",
          background: `radial-gradient(circle at 36% 30%, ${p.skinLight}, ${p.skinDark})`,
          boxShadow:
            "0 2px 5px rgba(0,0,0,0.22), inset 0 -1px 3px rgba(0,0,0,0.12), inset 0 1px 2px rgba(255,255,255,0.35)",
          zIndex: 1,
        }}
      />
    </div>
  );
}

function TwinCluster({ count = 100 }: { count?: number }) {
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 6,
        padding: "28px 24px",
        borderRadius: 16,
        border: "1px solid #e5e7eb",
        backgroundColor: "#fafafa",
        minHeight: 220,
        justifyContent: "center",
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <TwinAvatar key={i} idx={i} size={20} />
      ))}
    </div>
  );
}

/* ----------------------------- Reveal on Scroll ----------------------------- */

function Reveal({
  from = "left",
  children,
  delay = 0,
}: {
  from?: "left" | "right" | "bottom";
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const translate = !visible
    ? from === "left"
      ? "translateX(-60px)"
      : from === "right"
        ? "translateX(60px)"
        : "translateY(40px)"
    : "translate(0,0)";

  return (
    <div
      ref={ref}
      style={{
        transform: translate,
        opacity: visible ? 1 : 0,
        transition: `transform 0.9s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s, opacity 0.9s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* -------------------------------- Page --------------------------------- */

const STEPS = [
  {
    n: "01",
    title: "Talk to Mora",
    body:
      "Have a conversation like you would with a trusted friend. Nothing to set up, nothing to structure.",
    side: "left" as const,
  },
  {
    n: "02",
    title: "Mora remembers",
    body:
      "Your memories, values, and patterns are quietly woven into a private vault only you can see.",
    side: "right" as const,
  },
  {
    n: "03",
    title: "Get a mirror",
    body:
      "Ask anything about yourself. Run what-ifs. Decide out loud. Mora thinks alongside you.",
    side: "left" as const,
  },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#fafaf8", color: "#0d0d0d", overflowX: "hidden" }}>
      <style>{`
        @keyframes mora-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-14px); }
        }
        @keyframes mora-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -18px) scale(1.04); }
          66% { transform: translate(-16px, 12px) scale(0.98); }
        }
        @keyframes mora-spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes twin-float-a { 0%,100%{transform:translateY(0px) rotate(-1.5deg)} 50%{transform:translateY(-9px) rotate(1.5deg)} }
        @keyframes twin-float-b { 0%,100%{transform:translateY(-5px) rotate(1deg)} 50%{transform:translateY(5px) rotate(-1deg)} }
        @keyframes twin-float-c { 0%,100%{transform:translateY(3px) rotate(0.5deg)} 50%{transform:translateY(-7px) rotate(-0.5deg)} }
        @keyframes twin-float-d { 0%,100%{transform:translateY(-3px) rotate(-0.8deg)} 50%{transform:translateY(7px) rotate(0.8deg)} }
      `}</style>

      {/* Header */}
      <header
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 32px",
        }}
      >
        <Link href="/" style={{ display: "inline-flex", alignItems: "center" }}>
          <Image
            src="/mora-logo.png"
            alt="Mora"
            width={110}
            height={36}
            style={{ height: 32, width: "auto" }}
            priority
          />
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Link
            href="/sign-in"
            style={{
              display: "inline-flex",
              alignItems: "center",
              height: 38,
              padding: "0 16px",
              fontSize: 14,
              fontWeight: 500,
              color: "#0d0d0d",
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
          <Link
            href="/sign-up"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 38,
              padding: "0 18px",
              fontSize: 14,
              fontWeight: 500,
              color: "#fff",
              textDecoration: "none",
              borderRadius: 19,
              background: "#0d0d0d",
            }}
          >
            Try Mora
          </Link>
        </div>
      </header>

      {/* Hero — clean: gradient clouds + orbs only */}
      <section
        style={{
          position: "relative",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "120px 24px 100px",
        }}
      >
        {/* Gradient cloud background */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "-10%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "120vw",
            height: "110vh",
            background:
              "radial-gradient(ellipse 55% 45% at 50% 45%, rgba(255,198,225,0.55) 0%, rgba(198,166,240,0.45) 35%, rgba(143,133,223,0.22) 60%, rgba(250,250,248,0) 80%)",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "8%",
            left: "6%",
            width: 440,
            height: 440,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(239,182,239,0.55) 0%, rgba(239,182,239,0) 70%)",
            filter: "blur(40px)",
            animation: "mora-drift 14s ease-in-out infinite",
            pointerEvents: "none",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "5%",
            right: "6%",
            width: 520,
            height: 520,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(143,133,223,0.45) 0%, rgba(143,133,223,0) 70%)",
            filter: "blur(50px)",
            animation: "mora-drift 18s ease-in-out infinite reverse",
            pointerEvents: "none",
          }}
        />

        {/* Floating 3D orbs */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            top: "18%",
            right: "14%",
            width: 140,
            height: 140,
            borderRadius: "50%",
            background: ORB_GRADIENT,
            boxShadow:
              "0 40px 80px rgba(130,100,210,0.4), 0 10px 30px rgba(255,180,220,0.3), inset -10px -10px 30px rgba(100,70,180,0.25), inset 10px 10px 30px rgba(255,220,240,0.4)",
            animation: "mora-float 7s ease-in-out infinite",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "16%",
            left: "10%",
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: ORB_GRADIENT,
            boxShadow:
              "0 20px 40px rgba(130,100,210,0.35), inset -6px -6px 16px rgba(100,70,180,0.25)",
            animation: "mora-float 9s ease-in-out 1.5s infinite",
          }}
        />

        {/* Hero text */}
        <div
          style={{
            position: "relative",
            zIndex: 5,
            textAlign: "center",
            maxWidth: 900,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              marginBottom: 32,
              borderRadius: 999,
              background: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(139,92,246,0.15)",
              backdropFilter: "blur(12px)",
              fontSize: 13,
              fontWeight: 500,
              color: "#6f6bc9",
            }}
          >
            <MoraOrb size={10} />
            Free for the first 500 users · Limited time
          </div>

          <h1
            style={{
              fontFamily: "'Recoleta', 'DM Sans', serif",
              fontSize: "clamp(48px, 8vw, 88px)",
              fontWeight: 400,
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: "#0d0d0d",
              margin: "0 0 22px",
            }}
          >
            The AI that
            <br />
            actually knows you.
          </h1>

          <p
            style={{
              fontSize: "clamp(16px, 2vw, 19px)",
              lineHeight: 1.55,
              color: "#5a5a6e",
              maxWidth: 560,
              margin: "0 auto 40px",
            }}
          >
            Mora builds a private memory of who you are — so every conversation
            picks up where life left off.
          </p>

          <Link
            href="/sign-up"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              height: 54,
              padding: "0 30px",
              borderRadius: 27,
              background:
                "linear-gradient(135deg, #8f85df 0%, #c6a6f0 50%, #efb6ef 100%)",
              color: "#fff",
              fontSize: 16,
              fontWeight: 500,
              textDecoration: "none",
              boxShadow:
                "0 14px 36px rgba(143,133,223,0.4), inset 0 1px 0 rgba(255,255,255,0.3)",
              letterSpacing: "-0.01em",
            }}
          >
            <SparkleIcon size={16} />
            Start with Mora
          </Link>

          <p style={{ marginTop: 16, fontSize: 13, color: "#8a8a9a" }}>
            Sign up today to unlock 500 free credits · No credit card required
          </p>
        </div>
      </section>

      {/* Memory graph demo — mirrors the real vault UI */}
      <section
        style={{
          position: "relative",
          padding: "80px 24px 120px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <Reveal from="bottom">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#8f85df",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: 12,
              }}
            >
              Your vault
            </div>
            <h2
              style={{
                fontFamily: "'Recoleta', 'DM Sans', serif",
                fontSize: "clamp(30px, 4.2vw, 46px)",
                fontWeight: 400,
                letterSpacing: "-0.025em",
                margin: 0,
              }}
            >
              A living map of you.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "#6b6b7a",
                marginTop: 14,
                maxWidth: 520,
                marginInline: "auto",
              }}
            >
              Every memory is an orb. Drag them around — this is exactly what
              your real vault looks like.
            </p>
          </div>
        </Reveal>

        <Reveal from="bottom" delay={0.1}>
          <MemoryGraphDemo />
        </Reveal>
      </section>

      {/* How it works — side pop-ins */}
      <section
        style={{
          padding: "40px 24px 120px",
          maxWidth: 960,
          margin: "0 auto",
        }}
      >
        <Reveal from="bottom">
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#8f85df",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: 12,
              }}
            >
              How it works
            </div>
            <h2
              style={{
                fontFamily: "'Recoleta', 'DM Sans', serif",
                fontSize: "clamp(30px, 4.2vw, 46px)",
                fontWeight: 400,
                letterSpacing: "-0.025em",
                margin: 0,
              }}
            >
              From first hello to a mind of your own.
            </h2>
          </div>
        </Reveal>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {STEPS.map((step, i) => (
            <Reveal key={step.n} from={step.side} delay={i * 0.05}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 28,
                  padding: "28px 32px",
                  borderRadius: 22,
                  background: "#fff",
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow:
                    "0 10px 40px rgba(100,90,180,0.06), 0 2px 6px rgba(100,90,180,0.04)",
                  flexDirection: step.side === "right" ? "row-reverse" : "row",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: 72,
                    height: 72,
                    flexShrink: 0,
                    borderRadius: 20,
                    background:
                      "linear-gradient(135deg, #f5f0ff 0%, #ffe5f1 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow:
                      "inset 0 2px 4px rgba(255,255,255,0.8), 0 6px 18px rgba(143,133,223,0.12)",
                  }}
                >
                  <MoraOrb size={40} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "#b5b5c2",
                      letterSpacing: "0.12em",
                      marginBottom: 6,
                    }}
                  >
                    {step.n}
                  </div>
                  <h3
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      margin: "0 0 6px",
                    }}
                  >
                    {step.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 15,
                      lineHeight: 1.55,
                      color: "#6b6b7a",
                      margin: 0,
                    }}
                  >
                    {step.body}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Simulate — 100 digital twins */}
      <section
        style={{
          padding: "60px 24px 120px",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <Reveal from="bottom">
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: "#8f85df",
                textTransform: "uppercase",
                letterSpacing: "0.12em",
                marginBottom: 12,
              }}
            >
              Simulations
            </div>
            <h2
              style={{
                fontFamily: "'Recoleta', 'DM Sans', serif",
                fontSize: "clamp(30px, 4.2vw, 46px)",
                fontWeight: 400,
                letterSpacing: "-0.025em",
                margin: 0,
              }}
            >
              100 versions of you, running in parallel.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "#6b6b7a",
                marginTop: 14,
                maxWidth: 560,
                marginInline: "auto",
              }}
            >
              Mora clones your digital twin across possible futures and plays
              each one out — so you can see what life looks like on the other side.
            </p>
          </div>
        </Reveal>

        <Reveal from="bottom" delay={0.1}>
          <TwinCluster count={100} />
        </Reveal>
      </section>

      {/* Footer CTA */}
      <section
        style={{
          padding: "0 24px 80px",
          maxWidth: 880,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <Reveal from="bottom">
          <div
            style={{
              position: "relative",
              padding: "64px 32px",
              borderRadius: 32,
              overflow: "hidden",
              background:
                "linear-gradient(135deg, #f5f0ff 0%, #ffe5f1 50%, #f5f0ff 100%)",
              border: "1px solid rgba(139,92,246,0.12)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
              <div style={{ position: "relative" }}>
                <MoraOrb size={56} />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: -12,
                    borderRadius: "50%",
                    border: "1px solid rgba(143,133,223,0.3)",
                    animation: "mora-spin-slow 20s linear infinite",
                  }}
                />
              </div>
            </div>
            <h2
              style={{
                fontFamily: "'Recoleta', 'DM Sans', serif",
                fontSize: "clamp(28px, 3.7vw, 40px)",
                fontWeight: 400,
                letterSpacing: "-0.025em",
                margin: "0 0 12px",
              }}
            >
              Meet the version of AI that grows with you.
            </h2>
            <p
              style={{
                fontSize: 16,
                color: "#6b6b7a",
                margin: "0 auto 28px",
                maxWidth: 480,
              }}
            >
              No setup. No prompts to memorize. Just a conversation that remembers.
            </p>
            <Link
              href="/sign-up"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 10,
                height: 50,
                padding: "0 28px",
                borderRadius: 25,
                background: "#0d0d0d",
                color: "#fff",
                fontSize: 15,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              <SparkleIcon size={14} />
              Unlock 500 free credits
            </Link>
            <p style={{ marginTop: 14, fontSize: 13, color: "#a5a5b5" }}>
              Sign up today · No credit card required
            </p>
          </div>
        </Reveal>

        <div style={{ marginTop: 40, fontSize: 13, color: "#a5a5b5" }}>
          © {new Date().getFullYear()} Mora · The AI that knows you.
        </div>
      </section>
    </div>
  );
}
