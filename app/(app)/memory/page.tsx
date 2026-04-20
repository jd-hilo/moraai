import { KnowledgeGraph } from "@/components/memory/knowledge-graph";

export default function MemoryPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
      {/* Slim header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px 12px",
        flexShrink: 0,
      }}>
        <h1 style={{
          fontSize: "18px",
          fontWeight: 600,
          color: "#1a1a1a",
          letterSpacing: "-0.02em",
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
