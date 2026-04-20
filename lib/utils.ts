import type { ParsedConversation } from "@/lib/vault/types";

/**
 * Convert text to kebab-case slug.
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Rough token truncation (1 token ~ 4 chars).
 */
export function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...[truncated]";
}

/**
 * Parse ChatGPT export JSON into ParsedConversation[].
 * ChatGPT exports a JSON array where each item has:
 * - title: string
 * - create_time: number (unix timestamp)
 * - mapping: Record<string, { message: { author: { role }, content: { parts } } }>
 */
export function parseChatGPTExport(jsonData: unknown): ParsedConversation[] {
  const conversations: ParsedConversation[] = [];

  if (!Array.isArray(jsonData)) {
    throw new Error("ChatGPT export should be a JSON array");
  }

  for (const conv of jsonData) {
    if (!conv || typeof conv !== "object") continue;

    const record = conv as Record<string, unknown>;
    const title = (typeof record.title === "string" ? record.title : "Untitled");
    const createTime = typeof record.create_time === "number" ? record.create_time : Date.now() / 1000;
    const date = new Date(createTime * 1000).toISOString().split("T")[0];

    const messages: { role: string; content: string }[] = [];

    // ChatGPT uses a "mapping" object with nodes that have parent references
    const mapping = record.mapping;
    if (mapping && typeof mapping === "object") {
      // Collect all nodes and sort by their position in the tree
      const nodes: Array<{
        id: string;
        parent: string | null;
        role: string;
        content: string;
      }> = [];

      for (const [id, node] of Object.entries(mapping as Record<string, unknown>)) {
        if (!node || typeof node !== "object") continue;
        const nodeRecord = node as Record<string, unknown>;
        const message = nodeRecord.message as Record<string, unknown> | null;
        if (!message) continue;

        const author = message.author as Record<string, unknown> | null;
        if (!author) continue;

        const role = author.role as string;
        if (role !== "user" && role !== "assistant") continue;

        const contentObj = message.content as Record<string, unknown> | null;
        if (!contentObj) continue;

        const parts = contentObj.parts as unknown[];
        if (!Array.isArray(parts)) continue;

        const text = parts
          .filter((p) => typeof p === "string")
          .join("\n")
          .trim();

        if (!text) continue;

        nodes.push({
          id,
          parent: (nodeRecord.parent as string) || null,
          role,
          content: text,
        });
      }

      // Build ordered chain from root to leaf (follow first child path)
      const childMap = new Map<string | null, string[]>();
      for (const node of nodes) {
        const parentId = node.parent;
        if (!childMap.has(parentId)) childMap.set(parentId, []);
        childMap.get(parentId)!.push(node.id);
      }

      const nodeMap = new Map(nodes.map((n) => [n.id, n]));

      // Find root nodes (nodes whose parent isn't in our node set, or is the system message)
      const allMappingKeys = new Set(Object.keys(mapping as Record<string, unknown>));
      const visited = new Set<string>();

      // Walk the tree in order
      function walk(parentId: string | null) {
        const allChildren = [];
        for (const [key, val] of Object.entries(mapping as Record<string, unknown>)) {
          if (!val || typeof val !== "object") continue;
          const n = val as Record<string, unknown>;
          if (n.parent === parentId && !visited.has(key)) {
            allChildren.push(key);
          }
        }

        for (const childId of allChildren) {
          visited.add(childId);
          const node = nodeMap.get(childId);
          if (node) {
            messages.push({ role: node.role, content: node.content });
          }
          walk(childId);
        }
      }

      // Find the root of the mapping (node with null parent or parent not in mapping)
      for (const [key, val] of Object.entries(mapping as Record<string, unknown>)) {
        if (!val || typeof val !== "object") continue;
        const n = val as Record<string, unknown>;
        if (n.parent === null || !allMappingKeys.has(n.parent as string)) {
          walk(key);
          break;
        }
      }
    }

    if (messages.length > 0) {
      conversations.push({ title, date, messages });
    }
  }

  return conversations;
}

/**
 * Parse Claude export JSON into ParsedConversation[].
 * Claude exports vary, but typically contain conversation objects with
 * chat_messages arrays.
 */
export function parseClaudeExport(jsonData: unknown): ParsedConversation[] {
  const conversations: ParsedConversation[] = [];

  // Handle array of conversations
  const items = Array.isArray(jsonData) ? jsonData : [jsonData];

  for (const conv of items) {
    if (!conv || typeof conv !== "object") continue;
    const record = conv as Record<string, unknown>;

    const title = (typeof record.name === "string" ? record.name : null) ||
      (typeof record.title === "string" ? record.title : "Untitled");

    const createdAt = typeof record.created_at === "string"
      ? record.created_at
      : typeof record.created_at === "number"
        ? new Date(record.created_at * 1000).toISOString()
        : new Date().toISOString();
    const date = createdAt.split("T")[0];

    const messages: { role: string; content: string }[] = [];

    // Claude format: chat_messages array
    const chatMessages = record.chat_messages as unknown[];
    if (Array.isArray(chatMessages)) {
      for (const msg of chatMessages) {
        if (!msg || typeof msg !== "object") continue;
        const msgRecord = msg as Record<string, unknown>;
        const sender = msgRecord.sender as string;
        const role = sender === "human" ? "user" : sender === "assistant" ? "assistant" : null;
        if (!role) continue;

        // Content can be a string or an array of content blocks
        let text = "";
        if (typeof msgRecord.text === "string") {
          text = msgRecord.text;
        } else if (typeof msgRecord.content === "string") {
          text = msgRecord.content;
        } else if (Array.isArray(msgRecord.content)) {
          text = (msgRecord.content as Array<Record<string, unknown>>)
            .filter((c) => c.type === "text" && typeof c.text === "string")
            .map((c) => c.text as string)
            .join("\n");
        }

        if (text.trim()) {
          messages.push({ role, content: text.trim() });
        }
      }
    }

    if (messages.length > 0) {
      conversations.push({ title, date, messages });
    }
  }

  return conversations;
}
