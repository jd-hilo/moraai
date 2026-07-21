import { KnowledgeGraph } from "@/components/memory/knowledge-graph";

export default function MemoryPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden", background: "var(--color-bg)" }}>
      {/* Slim header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px 12px",
        flexShrink: 0,
      }}>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "32px",
          fontWeight: 400,
          color: "var(--color-text-primary)",
          letterSpacing: "-0.035em",
          margin: 0,
        }}>
          Your Memory
        </h1>
      </div>

      {/* Graph fills the rest */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <KnowledgeGraph />
      </div>
    </div>
  );
}
