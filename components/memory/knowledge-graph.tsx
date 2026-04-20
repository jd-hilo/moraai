"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import type { GraphData, GraphNode } from "@/lib/vault/types";
import { NodeDetail } from "./node-detail";

// ---------- orb styles ----------

type OrbStyle = {
  name: string;
  stops: [string, string, string, string, string];
  halo: string;
  legend: string;
};

const ORB_STYLES: OrbStyle[] = [
  { name: "Lilac",    stops: ["#ffc6e1", "#efb6ef", "#c6a6f0", "#8f85df", "#6f6bc9"], halo: "rgba(180,140,240,0.45)", legend: "#c6a6f0" },
  { name: "Lavender", stops: ["#ffd6f0", "#e0b3ff", "#b48bff", "#7a5cdb", "#4c3ca8"], halo: "rgba(150,110,230,0.45)", legend: "#b48bff" },
  { name: "Dusk",     stops: ["#ffb3d1", "#d99cf0", "#9b87eb", "#5f6bd9", "#3730a3"], halo: "rgba(120,110,220,0.45)", legend: "#9b87eb" },
  { name: "Plum",     stops: ["#f3e8ff", "#e9d5ff", "#c084fc", "#9333ea", "#581c87"], halo: "rgba(160,100,220,0.45)", legend: "#c084fc" },
  { name: "Ocean",    stops: ["#d4f7f2", "#a5f3fc", "#38bdf8", "#2563eb", "#1e3a8a"], halo: "rgba(80,160,240,0.45)",  legend: "#38bdf8" },
  { name: "Sky",      stops: ["#fef9c3", "#bae6fd", "#7dd3fc", "#3b82f6", "#1e40af"], halo: "rgba(110,170,240,0.45)", legend: "#7dd3fc" },
  { name: "Mint",     stops: ["#ecfdf5", "#a7f3d0", "#6ee7b7", "#10b981", "#047857"], halo: "rgba(80,200,160,0.45)",  legend: "#6ee7b7" },
  { name: "Sage",     stops: ["#fef9c3", "#d9f99d", "#86efac", "#4ade80", "#166534"], halo: "rgba(120,200,130,0.45)", legend: "#86efac" },
  { name: "Sun",      stops: ["#fefce8", "#fde68a", "#fcd34d", "#f59e0b", "#b45309"], halo: "rgba(250,200,80,0.45)",  legend: "#fcd34d" },
  { name: "Peach",    stops: ["#fff7ed", "#fed7aa", "#fdba74", "#fb923c", "#c2410c"], halo: "rgba(250,170,110,0.45)", legend: "#fdba74" },
  { name: "Coral",    stops: ["#ffe4e6", "#fecdd3", "#fb7185", "#e11d48", "#9f1239"], halo: "rgba(250,120,130,0.45)", legend: "#fb7185" },
  { name: "Rose",     stops: ["#fff1f5", "#fbcfe8", "#f472b6", "#db2777", "#831843"], halo: "rgba(240,120,180,0.45)", legend: "#f472b6" },
  { name: "Blush",    stops: ["#fff7ed", "#ffe4e6", "#fda4af", "#f43f5e", "#9f1239"], halo: "rgba(250,150,170,0.45)", legend: "#fda4af" },
  { name: "Mist",     stops: ["#f8fafc", "#e2e8f0", "#a1a1aa", "#64748b", "#334155"], halo: "rgba(140,150,170,0.40)", legend: "#a1a1aa" },
];

const STYLES_BY_NAME: Record<string, OrbStyle> = Object.fromEntries(
  ORB_STYLES.map(s => [s.name, s])
);

const DEFAULT_STYLES: Record<string, string> = {
  identity:  "Lilac",
  people:    "Rose",
  goals:     "Dusk",
  patterns:  "Peach",
  life:      "Mint",
  decisions: "Mist",
};

const STORAGE_KEY = "mora.graphStyles";

function getStyle(name: string | undefined, type?: string): OrbStyle {
  if (name && STYLES_BY_NAME[name]) return STYLES_BY_NAME[name];
  const fallbackName = (type && DEFAULT_STYLES[type]) || "Lilac";
  return STYLES_BY_NAME[fallbackName];
}

function orbGradient(style: OrbStyle): string {
  const [c0, c1, c2, c3, c4] = style.stops;
  return `radial-gradient(circle at 38% 35%, ${c0} 0%, ${c1} 25%, ${c2} 55%, ${c3} 82%, ${c4} 100%)`;
}

function loadStyles(): Record<string, string> {
  if (typeof window === "undefined") return DEFAULT_STYLES;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_STYLES, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_STYLES };
}

function saveStyles(styles: Record<string, string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(styles)); } catch { /* ignore */ }
}

// ---------- d3 types ----------

interface SimNode extends d3.SimulationNodeDatum {
  id: string; label: string; type: string;
  content: string; links: string[]; tags: string[]; updated: string; linkCount: number;
}
interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode | string; target: SimNode | string;
}

// ---------- component ----------

export function KnowledgeGraph() {
  const svgRef       = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [graphData, setGraphData]         = useState<GraphData | null>(null);
  const [selectedNode, setSelectedNode]   = useState<GraphNode | null>(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<string | null>(null);
  const [styles, setStyles]               = useState<Record<string, string>>(DEFAULT_STYLES);
  const [customizerOpen, setCustomizerOpen] = useState(false);

  useEffect(() => { setStyles(loadStyles()); }, []);

  useEffect(() => {
    fetch("/api/vault/graph")
      .then(r => { if (!r.ok) throw new Error("Failed to load graph"); return r.json(); })
      .then((d: GraphData) => { setGraphData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  const handleStyleChange = useCallback((type: string, styleName: string) => {
    setStyles(prev => {
      const next = { ...prev, [type]: styleName };
      saveStyles(next);
      return next;
    });
  }, []);

  const handleNodeSelect = useCallback((node: GraphNode) => setSelectedNode(node), []);

  // D3 force graph — re-runs when data or styles change
  useEffect(() => {
    if (!graphData || !svgRef.current || !containerRef.current) return;
    if (graphData.nodes.length === 0) return;

    const container = containerRef.current;
    const width  = container.clientWidth;
    const height = container.clientHeight;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();
    svg.attr("width", width).attr("height", height);

    // ---- Gradient defs (5-stop per category) ----
    const defs = svg.append("defs");
    Object.entries(styles).forEach(([type, styleName]) => {
      const style = getStyle(styleName, type);
      const grad = defs.append("radialGradient")
        .attr("id", `grad-${type}`)
        .attr("cx", "38%").attr("cy", "35%")
        .attr("r", "72%");
      const offsets = ["0%", "25%", "55%", "82%", "100%"];
      style.stops.forEach((stopColor, i) => {
        grad.append("stop").attr("offset", offsets[i]).attr("stop-color", stopColor);
      });
    });

    // ---- Drop shadow filter ----
    const filter = defs.append("filter").attr("id", "node-shadow")
      .attr("x", "-30%").attr("y", "-30%").attr("width", "160%").attr("height", "160%");
    filter.append("feDropShadow")
      .attr("dx", "0").attr("dy", "2").attr("stdDeviation", "4")
      .attr("flood-color", "rgba(0,0,0,0.12)");

    const linkCounts = new Map<string, number>();
    for (const e of graphData.edges) {
      linkCounts.set(e.source, (linkCounts.get(e.source) || 0) + 1);
      linkCounts.set(e.target, (linkCounts.get(e.target) || 0) + 1);
    }

    const simNodes: SimNode[] = graphData.nodes.map(n => ({
      ...n, linkCount: linkCounts.get(n.id) || 0,
    }));
    const simLinks: SimLink[] = graphData.edges.map(e => ({ source: e.source, target: e.target }));

    const g = svg.append("g");

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", ev => g.attr("transform", ev.transform));
    svg.call(zoom);

    const simulation = d3.forceSimulation<SimNode>(simNodes)
      .force("link", d3.forceLink<SimNode, SimLink>(simLinks).id(d => d.id).distance(120))
      .force("charge", d3.forceManyBody().strength(-280))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(50));

    const link = g.append("g").selectAll("line").data(simLinks).join("line")
      .attr("stroke", "rgba(0,0,0,0.07)")
      .attr("stroke-width", 1.5);

    const nodeG = g.append("g")
      .selectAll<SVGGElement, SimNode>("g")
      .data(simNodes)
      .join("g")
      .attr("cursor", "pointer")
      .on("click", (_ev, d) => setSelectedNode({
        id: d.id, label: d.label, type: d.type,
        content: d.content, links: d.links, tags: d.tags, updated: d.updated,
      }));

    // Outer glow ring
    nodeG.append("circle")
      .attr("r", d => Math.max(14, Math.min(34, 14 + d.linkCount * 3)) + 6)
      .attr("fill", d => getStyle(styles[d.type], d.type).legend)
      .attr("opacity", 0.12);

    // Main orb
    nodeG.append("circle")
      .attr("r", d => Math.max(14, Math.min(34, 14 + d.linkCount * 3)))
      .attr("fill", d => `url(#grad-${d.type})`)
      .attr("filter", "url(#node-shadow)")
      .attr("stroke", "#fff")
      .attr("stroke-width", 2.5);

    // Labels
    const label = g.append("g")
      .selectAll<SVGTextElement, SimNode>("text")
      .data(simNodes)
      .join("text")
      .text(d => d.label)
      .attr("text-anchor", "middle")
      .attr("dy", d => Math.max(14, Math.min(34, 14 + d.linkCount * 3)) + 17)
      .attr("font-size", "11px")
      .attr("font-family", "'DM Sans', -apple-system, sans-serif")
      .attr("fill", "#777")
      .attr("pointer-events", "none");

    const drag = d3.drag<SVGGElement, SimNode>()
      .on("start", (ev, d) => { if (!ev.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on("drag",  (ev, d) => { d.fx = ev.x; d.fy = ev.y; })
      .on("end",   (ev, d) => { if (!ev.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; });
    nodeG.call(drag);

    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as SimNode).x || 0)
        .attr("y1", d => (d.source as SimNode).y || 0)
        .attr("x2", d => (d.target as SimNode).x || 0)
        .attr("y2", d => (d.target as SimNode).y || 0);
      nodeG.attr("transform", d => `translate(${d.x || 0},${d.y || 0})`);
      label.attr("x", d => d.x || 0).attr("y", d => d.y || 0);
    });

    return () => { simulation.stop(); };
  }, [graphData, styles]);

  // ---- states ----
  if (loading) return (
    <div style={centeredStyle}>
      <div style={{ color: "#bbb", fontSize: 14 }}>Loading your memory graph...</div>
    </div>
  );
  if (error) return (
    <div style={centeredStyle}>
      <div style={{ color: "#888", fontSize: 14 }}>{error}</div>
    </div>
  );
  if (!graphData || graphData.nodes.length === 0) return (
    <div style={{ ...centeredStyle, flexDirection: "column", gap: 8 }}>
      <div
        style={{
          width: 48, height: 48, borderRadius: "50%",
          background: orbGradient(getStyle("Lilac")),
          boxShadow: "0 0 24px rgba(180,140,240,0.45), inset 0 0 8px rgba(255,220,240,0.5)",
          marginBottom: 8,
        }}
      />
      <p style={{ color: "#888", fontSize: 14 }}>No memories yet.</p>
      <p style={{ color: "#bbb", fontSize: 13 }}>Start chatting to build your memory graph.</p>
    </div>
  );

  return (
    <div ref={containerRef} style={{ flex: 1, position: "relative", width: "100%", height: "100%" }}>
      <svg ref={svgRef} style={{ width: "100%", height: "100%", display: "block" }} />

      {/* Legend + customize button */}
      <div style={{ position: "absolute", bottom: 16, left: 16, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {Object.entries(styles).map(([type, styleName]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#777" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: orbGradient(getStyle(styleName, type)) }} />
            {type}
          </div>
        ))}
        <button
          onClick={() => setCustomizerOpen(v => !v)}
          title="Customize orb styles"
          style={{
            marginLeft: 4,
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "4px 10px", borderRadius: 20,
            border: "1px solid rgba(0,0,0,0.1)", background: "rgba(255,255,255,0.9)",
            fontSize: 11, color: "#555", cursor: "pointer",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
            <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Customize
        </button>
      </div>

      {/* Orb style customizer panel */}
      {customizerOpen && (
        <div style={{
          position: "absolute", bottom: 52, left: 16,
          background: "rgba(255,255,255,0.97)", backdropFilter: "blur(16px)",
          border: "1px solid rgba(0,0,0,0.08)", borderRadius: 16,
          padding: "16px 20px", boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
          width: 300, zIndex: 20,
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: "#1a1a1a" }}>Orb styles</span>
            <button
              onClick={() => { setStyles({ ...DEFAULT_STYLES }); saveStyles(DEFAULT_STYLES); }}
              style={{ fontSize: 11, color: "#888", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Reset
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Object.entries(styles).map(([type, activeName]) => (
              <div key={type}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: "#555", textTransform: "capitalize", fontWeight: 500 }}>{type}</span>
                  <span style={{ fontSize: 11, color: "#9ca3af" }}>{activeName}</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
                  {ORB_STYLES.map(style => {
                    const selected = style.name === activeName;
                    return (
                      <button
                        key={style.name}
                        type="button"
                        title={style.name}
                        onClick={() => handleStyleChange(type, style.name)}
                        style={{
                          width: 22, height: 22, borderRadius: "50%",
                          background: orbGradient(style),
                          border: selected ? "2px solid #0d0d0d" : "1px solid rgba(0,0,0,0.08)",
                          boxShadow: selected
                            ? `0 0 0 2px #fff inset, 0 0 8px ${style.halo}`
                            : `0 0 4px ${style.halo}`,
                          padding: 0, cursor: "pointer",
                          transition: "transform 0.12s, box-shadow 0.12s",
                          transform: selected ? "scale(1.08)" : "scale(1)",
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <NodeDetail
        node={selectedNode}
        allNodes={graphData.nodes}
        onClose={() => setSelectedNode(null)}
        onNodeSelect={handleNodeSelect}
      />
    </div>
  );
}

const centeredStyle: React.CSSProperties = {
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%",
};
