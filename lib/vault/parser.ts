import type { GraphData, GraphNode, GraphEdge } from "./types";

/**
 * Simple inline YAML frontmatter parser.
 * Parses key: value lines and tags: [a, b] arrays.
 */
function parseFrontmatter(content: string): {
  metadata: Record<string, string | string[]>;
  body: string;
} {
  const metadata: Record<string, string | string[]> = {};

  if (!content.startsWith("---")) {
    return { metadata, body: content };
  }

  const endIndex = content.indexOf("---", 3);
  if (endIndex === -1) {
    return { metadata, body: content };
  }

  const frontmatterBlock = content.slice(3, endIndex).trim();
  const body = content.slice(endIndex + 3).trim();

  const lines = frontmatterBlock.split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIndex = trimmed.indexOf(":");
    if (colonIndex === -1) continue;

    const key = trimmed.slice(0, colonIndex).trim();
    let value = trimmed.slice(colonIndex + 1).trim();

    // Handle array syntax: [a, b, c]
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1);
      const items = inner
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      metadata[key] = items;
    } else {
      // Remove surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      metadata[key] = value;
    }
  }

  return { metadata, body };
}

/**
 * Extract [[wikilinks]] from markdown content.
 */
function extractWikilinks(content: string): string[] {
  const links: string[] = [];
  const regex = /\[\[([^\]]+)\]\]/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    links.push(match[1].toLowerCase().replace(/\s+/g, "-"));
  }
  return [...new Set(links)];
}

/**
 * Derive slug from filename (remove extension, lowercase).
 */
function filenameToSlug(filename: string): string {
  return filename
    .replace(/\.md$/, "")
    .replace(/^.*\//, "") // remove directory prefix
    .toLowerCase()
    .replace(/\s+/g, "-");
}

/**
 * Infer entity type from directory path or tags.
 */
function inferType(filename: string, tags: string[]): string {
  const lower = filename.toLowerCase();
  if (lower.startsWith("identity/") || lower.includes("identity")) return "identity";
  if (lower.startsWith("people/") || lower.includes("people")) return "people";
  if (lower.startsWith("goals/") || lower.includes("goals")) return "goals";
  if (lower.startsWith("patterns/") || lower.includes("patterns")) return "patterns";
  if (lower.startsWith("life/") || lower.includes("life")) return "life";
  if (lower.startsWith("decisions/") || lower.includes("decisions")) return "decisions";

  // Try from tags
  const typeTag = tags.find((t) =>
    ["identity", "people", "goals", "patterns", "life", "decisions"].includes(t)
  );
  if (typeTag) return typeTag;

  return "unknown";
}

/**
 * Parse a vault (Record of filename->content) into a graph structure.
 */
export function parseVaultToGraph(files: Record<string, string>): GraphData {
  const nodes: GraphNode[] = [];
  const edgeSet = new Set<string>();
  const edges: GraphEdge[] = [];

  // Skip non-markdown files and special files
  const skipFiles = ["_index.md", "_log.md"];

  for (const [filename, content] of Object.entries(files)) {
    if (!filename.endsWith(".md")) continue;
    const basename = filename.split("/").pop() || filename;
    if (skipFiles.includes(basename)) continue;

    const { metadata, body } = parseFrontmatter(content);

    const slug = filenameToSlug(filename);
    const title =
      (typeof metadata.title === "string" ? metadata.title : null) ||
      basename.replace(/\.md$/, "").replace(/-/g, " ");
    const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
    const type =
      (typeof metadata.type === "string" ? metadata.type : null) ||
      inferType(filename, tags);
    const updated =
      (typeof metadata.updated === "string" ? metadata.updated : null) ||
      (typeof metadata.date === "string" ? metadata.date : "") ||
      "";

    const links = extractWikilinks(body);

    nodes.push({
      id: slug,
      label: title,
      type,
      content: body,
      links,
      tags,
      updated,
    });
  }

  // Build edges from links
  const nodeIds = new Set(nodes.map((n) => n.id));

  for (const node of nodes) {
    for (const link of node.links) {
      if (nodeIds.has(link) && link !== node.id) {
        const edgeKey = [node.id, link].sort().join("--");
        if (!edgeSet.has(edgeKey)) {
          edgeSet.add(edgeKey);
          edges.push({ source: node.id, target: link });
        }
      }
    }
  }

  return { nodes, edges };
}
