export interface VaultFile {
  path: string;
  content: string;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  content: string;
  links: string[];
  tags: string[];
  updated: string;
}

export interface GraphEdge {
  source: string;
  target: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface ExtractedEntity {
  type: string;
  slug: string;
  title: string;
  content: string;
  links: string[];
  tags: string[];
}

export type MergedEntity = ExtractedEntity;

export interface ParsedConversation {
  title: string;
  date: string;
  messages: { role: string; content: string }[];
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
  memoryUpdate?: MemoryUpdate;
}

export interface MemoryUpdateChange {
  filepath: string;
  action: "create" | "update" | "append";
  section?: string | null;
  /** Short human summary like "Added boyfriend detail" */
  summary: string;
  /** Optional before/after snippets for diff display */
  diff?: {
    before?: string;
    after: string;
  };
}

export interface MemoryUpdate {
  changes: MemoryUpdateChange[];
  /** Overall one-line summary, e.g. "Updated people/brian.md" */
  summary: string;
  /** Milliseconds the ingest took */
  durationMs: number;
  /** ISO timestamp when ingest finished */
  completedAt: string;
}

export interface VaultOperations {
  operations: VaultOperation[];
  index_updates: { slug: string; summary: string }[];
  log_entry: string;
}

export interface VaultOperation {
  action: "create" | "update" | "append";
  filepath: string;
  content: string;
  section?: string | null;
}
