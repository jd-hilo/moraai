"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ProcessingScreen } from "./processing-screen";
import { KnowledgeGraph } from "@/components/memory/knowledge-graph";

type Source = "chatgpt" | "claude";
type Step = "choose" | "processing" | "done";

const ORB_GRADIENT =
  "radial-gradient(circle at 38% 38%, #ffc6e1 0%, #efb6ef 28%, #c6a6f0 55%, #8f85df 85%, #6f6bc9 100%)";

/* ── small helpers ───────────────────────────────────────────────────── */

function MoraOrb({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        background: ORB_GRADIENT,
        boxShadow: "0 0 20px rgba(180,140,240,0.4), 0 0 6px rgba(255,180,220,0.5)",
        flexShrink: 0,
      }}
    />
  );
}

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    style={{ color: "#8f85df", textDecoration: "none", fontWeight: 500, borderBottom: "1px solid rgba(143,133,223,0.3)" }}
  >
    {children}
  </a>
);

function StepDot({ n, text }: { n: number; text: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        background: ORB_GRADIENT,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontWeight: 600, color: "#fff",
      }}>
        {n}
      </div>
      <p style={{ fontSize: 14, color: "#444", lineHeight: 1.6, margin: 0, paddingTop: 4 }}>{text}</p>
    </div>
  );
}

/* ── Import modal ────────────────────────────────────────────────────── */

interface ModalProps {
  source: Source;
  onClose: () => void;
  onFile: (file: File, source: Source) => void;
}

const INSTRUCTIONS: Record<Source, { title: string; icon: React.ReactNode; steps: React.ReactNode[] }> = {
  chatgpt: {
    title: "Import from ChatGPT",
    icon: (
      <Image src="/chatgpt-logo.png" alt="ChatGPT" width={40} height={40} style={{ borderRadius: 10, flexShrink: 0 }} />
    ),
    steps: [
      <><A href="https://chat.openai.com">Open ChatGPT</A> and sign in</>,
      <>Click your profile icon → <A href="https://chatgpt.com/#settings/DataControls">Settings</A></>,
      <>Go to <strong>Data controls</strong> → click <strong>Export data</strong></>,
      <>OpenAI emails you a link — download the ZIP</>,
      <>Unzip it and find <code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 5px", borderRadius: 4, fontSize: 13 }}>conversations.json</code> inside</>,
      <>Drop that file below ↓</>,
    ],
  },
  claude: {
    title: "Import from Claude",
    icon: (
      <Image src="/claude-logo.png" alt="Claude" width={40} height={40} style={{ borderRadius: 10, flexShrink: 0 }} />
    ),
    steps: [
      <><A href="https://claude.ai">Open Claude</A> and sign in</>,
      <>Click your profile → <A href="https://claude.ai/settings">Settings</A></>,
      <>Go to <strong>Privacy</strong> → click <strong>Export data</strong></>,
      <>Anthropic emails you a download link</>,
      <>Download the ZIP — find <code style={{ background: "rgba(0,0,0,0.05)", padding: "1px 5px", borderRadius: 4, fontSize: 13 }}>conversations.json</code> inside</>,
      <>Drop that file below ↓</>,
    ],
  },
};

function ImportModal({ source, onClose, onFile }: ModalProps) {
  const info = INSTRUCTIONS[source];
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  // close on backdrop click or Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file, source);
  };

  return (
    /* backdrop */
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 50,
        background: "rgba(10,8,20,0.45)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
    >
      {/* sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 24,
          width: "100%",
          maxWidth: 480,
          padding: "28px 28px 24px",
          boxShadow: "0 32px 80px rgba(0,0,0,0.18), 0 4px 12px rgba(0,0,0,0.08)",
          position: "relative",
          animation: "modal-in 0.25s cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {/* close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 16, right: 16,
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(0,0,0,0.06)", border: "none",
            cursor: "pointer", fontSize: 14, color: "#666",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          ✕
        </button>

        {/* header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
          {info.icon}
          <h2 style={{
            fontFamily: "'Recoleta', 'DM Sans', serif",
            fontSize: 20, fontWeight: 400,
            color: "#0d0d0d", letterSpacing: "-0.02em", margin: 0,
          }}>
            {info.title}
          </h2>
        </div>

        {/* steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
          {info.steps.map((s, i) => (
            <StepDot key={i} n={i + 1} text={s} />
          ))}
        </div>

        {/* drop zone */}
        <div
          onDragEnter={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: `2px dashed ${isDragging ? "#c6a6f0" : "rgba(0,0,0,0.12)"}`,
            borderRadius: 14,
            padding: "26px 20px",
            textAlign: "center",
            cursor: "pointer",
            background: isDragging ? "rgba(198,166,240,0.07)" : "#fafafa",
            transition: "all 0.18s",
          }}
        >
          <div style={{ fontSize: 26, marginBottom: 8 }}>📂</div>
          <div style={{ fontSize: 14, fontWeight: 500, color: "#2a2a3a", marginBottom: 3 }}>
            Drop conversations.json or ZIP
          </div>
          <div style={{ fontSize: 12, color: "#aaa" }}>or click to browse</div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.zip"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f, source); }}
            style={{ display: "none" }}
          />
        </div>

        <p style={{ fontSize: 11, color: "#bbb", textAlign: "center", marginTop: 12 }}>
          Your data stays private and never leaves your account.
        </p>
      </div>
    </div>
  );
}

/* ── Source card ─────────────────────────────────────────────────────── */

function SourceCard({
  icon, name, desc, onClick,
}: { icon: React.ReactNode; name: string; desc: string; onClick: () => void }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: "flex", alignItems: "center", gap: 16,
        padding: "18px 20px",
        borderRadius: 18,
        border: `1.5px solid ${hov ? "rgba(198,166,240,0.6)" : "rgba(0,0,0,0.08)"}`,
        background: hov ? "rgba(198,166,240,0.05)" : "#fff",
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "all 0.18s",
        boxShadow: hov ? "0 8px 24px rgba(143,133,223,0.12)" : "0 2px 8px rgba(0,0,0,0.04)",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {icon}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: "#0d0d0d" }}>{name}</div>
        <div style={{ fontSize: 12, color: "#999", marginTop: 2 }}>{desc}</div>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "#ccc" }}>
        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    </button>
  );
}

/* ── Main wizard ─────────────────────────────────────────────────────── */

export function ImportWizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [openModal, setOpenModal] = useState<Source | null>(null);
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);

  const handleFile = useCallback(async (file: File, source: Source) => {
    setOpenModal(null);
    setStep("processing");
    setProgressMessages(["Starting import…"]);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", source);

      const response = await fetch("/api/ingest/import", { method: "POST", body: formData });
      if (!response.ok) throw new Error("Import failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const msg = line.slice(6).trim();
            if (msg) {
              setProgressMessages((p) => [...p, msg]);
              if (msg.includes("Done. I know you now.")) setIsComplete(true);
            }
          }
        }
      }

      setIsComplete(true);
      setStep("done");
    } catch (err) {
      console.error("Import error:", err);
      setProgressMessages((p) => [...p, "Something went wrong. Please try again."]);
    }
  }, []);

  /* processing */
  if (step === "processing") {
    return <ProcessingScreen messages={progressMessages} isComplete={isComplete} />;
  }

  /* done — show vault before proceeding */
  if (step === "done") {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(180deg, #fafaf8 0%, #f5f0ff 60%, #fafaf8 100%)",
      }}>
        <style>{anim}</style>

        {/* Header */}
        <header style={{ padding: "20px 28px", display: "flex", alignItems: "center" }}>
          <Image src="/mora-logo.png" alt="Mora" width={100} height={32} style={{ height: 28, width: "auto" }} />
        </header>

        {/* Hero text */}
        <div style={{ textAlign: "center", padding: "32px 24px 20px" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{ position: "relative" }}>
              <MoraOrb size={44} />
              <div style={{
                position: "absolute", inset: -10, borderRadius: "50%",
                border: "1px solid rgba(143,133,223,0.35)",
                animation: "mora-spin 16s linear infinite",
              }} />
            </div>
          </div>
          <h2 style={{ ...h1, fontSize: 26, marginBottom: 6 }}>Here&apos;s what I know about you.</h2>
          <p style={{ ...body, fontSize: 14 }}>
            Drag the orbs around — each one is a memory. When you&apos;re ready, let&apos;s talk.
          </p>
        </div>

        {/* Live knowledge graph */}
        <div style={{
          flex: 1,
          margin: "0 24px 24px",
          borderRadius: 20,
          overflow: "hidden",
          background: "#fff",
          border: "1px solid rgba(0,0,0,0.06)",
          boxShadow: "0 4px 24px rgba(100,90,180,0.06)",
          minHeight: 380,
        }}>
          <KnowledgeGraph />
        </div>

        {/* CTA */}
        <div style={{ textAlign: "center", padding: "0 24px 40px" }}>
          <button onClick={() => router.push("/chat")} style={primBtn}>
            Start chatting →
          </button>
        </div>
      </div>
    );
  }

  /* choose */
  return (
    <>
      <style>{anim}</style>

      <div style={page}>
        <header style={headerSt}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
            <Image src="/mora-logo.png" alt="Mora" width={100} height={32} style={{ height: 28, width: "auto" }} />
          </Link>
        </header>

        <div style={{ maxWidth: 440, width: "100%", textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
            <MoraOrb size={48} />
          </div>

          <h1 style={{ ...h1, fontSize: 26, marginBottom: 8 }}>
            Bring your chats with you.
          </h1>
          <p style={{ ...body, marginBottom: 36 }}>
            Mora learns who you are from your past conversations.
            Import from ChatGPT or Claude to hit the ground running.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            <SourceCard
              icon={<Image src="/chatgpt-logo.png" alt="ChatGPT" width={40} height={40} style={{ borderRadius: 10, flexShrink: 0 }} />}
              name="Import from ChatGPT"
              desc="Upload your conversations export"
              onClick={() => setOpenModal("chatgpt")}
            />

            <SourceCard
              icon={<Image src="/claude-logo.png" alt="Claude" width={40} height={40} style={{ borderRadius: 10, flexShrink: 0 }} />}
              name="Import from Claude"
              desc="Upload your Claude data export"
              onClick={() => setOpenModal("claude")}
            />
          </div>

          <button
            onClick={() => router.push("/chat")}
            style={{
              background: "none", border: "none",
              fontSize: 13, color: "#aaa", cursor: "pointer",
              padding: "8px 0", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Skip — Mora will learn as we go
          </button>
        </div>
      </div>

      {/* Modal */}
      {openModal && (
        <ImportModal
          source={openModal}
          onClose={() => setOpenModal(null)}
          onFile={handleFile}
        />
      )}
    </>
  );
}

/* ── Styles ──────────────────────────────────────────────────────────── */

const page: React.CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  padding: "80px 24px 40px",
  background: "linear-gradient(180deg, #fafaf8 0%, #f5f0ff 60%, #fafaf8 100%)",
  position: "relative",
};

const headerSt: React.CSSProperties = {
  position: "absolute",
  top: 0, left: 0, right: 0,
  padding: "20px 28px",
  display: "flex",
  alignItems: "center",
};

const h1: React.CSSProperties = {
  fontFamily: "'Recoleta', 'DM Sans', serif",
  fontSize: 28, fontWeight: 400,
  color: "#0d0d0d", letterSpacing: "-0.025em",
  margin: "0 0 6px",
};

const body: React.CSSProperties = {
  fontSize: 15, color: "#6b6b7a",
  lineHeight: 1.55, margin: 0,
};

const primBtn: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 46, padding: "0 24px",
  borderRadius: 23,
  background: "linear-gradient(135deg, #8f85df 0%, #c6a6f0 60%, #efb6ef 100%)",
  color: "#fff", fontSize: 14, fontWeight: 500,
  border: "none", cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  boxShadow: "0 8px 24px rgba(143,133,223,0.35)",
};

const anim = `
  @keyframes mora-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes modal-in {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }
`;
