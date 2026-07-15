import { slugify, truncateToTokens } from "@/lib/utils";
import {
  readAllVaultFilesForUser,
  withUserVaultWriteLock,
  writeMultipleVaultFilesForUser,
} from "@/lib/vault/storage";
import type { VaultFile } from "@/lib/vault/types";

export const MEMORY_CATEGORIES = [
  "identity",
  "people",
  "goals",
  "patterns",
  "life",
  "decisions",
  "misc",
] as const;

export type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

const EMPTY_INDEX = "# Vault Index\n";
const EMPTY_LOG = "# Conversation Log\n\nRecent conversation updates will appear here.\n";
const STOP_WORDS = new Set([
  "about", "after", "again", "also", "been", "before", "being", "could", "does",
  "from", "have", "into", "just", "more", "most", "should", "that", "their", "them",
  "then", "there", "these", "they", "this", "those", "want", "what", "when", "where",
  "which", "with", "would", "your", "you", "mine", "myself", "tell", "know",
]);

export class McpMemoryError extends Error {
  constructor(public code: "INVALID_INPUT", message: string) {
    super(message);
    this.name = "McpMemoryError";
  }
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function compact(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function queryTerms(query: string): string[] {
  const all = normalize(query).split(" ").filter((term) => term.length > 1);
  const meaningful = all.filter((term) => !STOP_WORDS.has(term));
  return [...new Set(meaningful.length > 0 ? meaningful : all)];
}

function stripFrontmatter(content: string): string {
  if (!content.startsWith("---")) return content.trim();
  const end = content.indexOf("---", 3);
  return end === -1 ? content.trim() : content.slice(end + 3).trim();
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let position = 0;
  while ((position = haystack.indexOf(needle, position)) !== -1) {
    count += 1;
    position += needle.length;
  }
  return count;
}

function matchingIndexText(index: string, path: string): string {
  const slug = path.split("/").pop()?.replace(/\.md$/, "") ?? "";
  return index
    .split("\n")
    .filter((line) => line.toLowerCase().includes(path.toLowerCase()) || line.toLowerCase().includes(slug))
    .join(" ");
}

function relevanceScore(query: string, path: string, content: string, indexText: string): number {
  const terms = queryTerms(query);
  if (terms.length === 0) return 0;
  const normalizedPath = normalize(path);
  const normalizedIndex = normalize(indexText);
  const normalizedContent = normalize(stripFrontmatter(content));
  const normalizedQuery = normalize(query);
  let score = 0;

  for (const term of terms) {
    if (normalizedPath.includes(term)) score += 8;
    if (normalizedIndex.includes(term)) score += 5;
    score += Math.min(countOccurrences(normalizedContent, term), 3) * 2;
  }
  if (normalizedQuery.length >= 4 && normalizedContent.includes(normalizedQuery)) score += 12;
  if (normalizedQuery.length >= 4 && normalizedIndex.includes(normalizedQuery)) score += 10;
  return score;
}

export interface RecallResult {
  kind: "ready" | "empty" | "no_match";
  memory: string;
  recordsUsed: number;
}

export function selectRelevantMemory(
  query: string,
  files: Record<string, string>,
  maxRecords = 8,
  maxTokens = 6_000
): RecallResult {
  const records = Object.entries(files).filter(
    ([path]) => path.endsWith(".md") && !path.startsWith("_")
  );
  if (records.length === 0) return { kind: "empty", memory: "", recordsUsed: 0 };

  const index = files["_index.md"] ?? "";
  const selected = records
    .map(([path, content]) => ({
      path,
      content: stripFrontmatter(content),
      score: relevanceScore(query, path, content, matchingIndexText(index, path)),
    }))
    .filter((record) => record.score > 0 && record.content.length > 0)
    .sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
    .slice(0, maxRecords);

  if (selected.length === 0) return { kind: "no_match", memory: "", recordsUsed: 0 };
  const memory = truncateToTokens(
    selected.map(({ content }) => `<memory_record>\n${content}\n</memory_record>`).join("\n\n"),
    maxTokens
  );
  return { kind: "ready", memory, recordsUsed: selected.length };
}

export async function recallMemoryForUser(
  userId: string,
  query: string,
  maxRecords = 8,
  maxTokens = 6_000
): Promise<RecallResult> {
  return selectRelevantMemory(
    query,
    await readAllVaultFilesForUser(userId),
    maxRecords,
    maxTokens
  );
}

export interface SaveMemoryInput {
  category: MemoryCategory;
  subject: string;
  memory: string;
  context?: string;
}

export interface SaveMemoryResult {
  outcome: "created" | "updated" | "unchanged";
  category: MemoryCategory;
  subject: string;
  summary: string;
}

function memoryEntry(memory: string, context?: string): string {
  return context ? `- ${memory}\n  - Context: ${context}` : `- ${memory}`;
}

function memoryPattern(memory: string): RegExp {
  return new RegExp(
    `^- ${escapeRegExp(memory)}(?:\\n  - Context: [^\\n]*)?`,
    "m"
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function saveMemoryForUser(
  userId: string,
  input: SaveMemoryInput
): Promise<SaveMemoryResult> {
  const subject = compact(input.subject);
  const memory = compact(input.memory);
  const context = input.context ? compact(input.context) : undefined;
  const slug = slugify(subject);
  if (!subject || !memory || !slug) {
    throw new McpMemoryError("INVALID_INPUT", "Subject and memory must contain readable text.");
  }

  return withUserVaultWriteLock(userId, async (db) => {
    const files = await readAllVaultFilesForUser(userId, db);
    const path = `${input.category}/${slug}.md`;
    const existing = files[path];
    const entry = memoryEntry(memory, context);
    const existingEntry = existing?.match(memoryPattern(memory))?.[0];
    if (existingEntry === entry) {
      return {
        outcome: "unchanged",
        category: input.category,
        subject,
        summary: `Mora already remembers this about ${subject}.`,
      };
    }

    const date = new Date().toISOString().slice(0, 10);
    const refreshedExisting = existing?.replace(
      /^updated: .*$/m,
      `updated: ${date}`
    );
    const content = refreshedExisting
      ? existingEntry
        ? `${refreshedExisting.replace(memoryPattern(memory), entry).trimEnd()}\n`
        : `${refreshedExisting.trimEnd()}\n${entry}\n`
      : `---\ntitle: ${JSON.stringify(subject)}\ntype: ${input.category}\nupdated: ${date}\n---\n\n## Approved memories\n${entry}\n`;

    let index = files["_index.md"] ?? EMPTY_INDEX;
    const indexPattern = new RegExp(`\\[\\[${escapeRegExp(subject)}\\]\\]`, "i");
    if (!indexPattern.test(index)) {
      index = `${index.trimEnd()}\n- [[${subject}]]: ${memory.slice(0, 160)}\n`;
    }

    let log = files["_log.md"] ?? EMPTY_LOG;
    log = `${log.trimEnd()}\n\n## ${new Date().toISOString()}\nSaved an approved memory about ${subject}.\n`;

    const changed: VaultFile[] = [{ path, content }];
    if (index !== files["_index.md"]) changed.push({ path: "_index.md", content: index });
    if (log !== files["_log.md"]) changed.push({ path: "_log.md", content: log });
    await writeMultipleVaultFilesForUser(userId, changed, db);

    const outcome = existing ? "updated" : "created";
    return {
      outcome,
      category: input.category,
      subject,
      summary: `${outcome === "created" ? "Created" : "Updated"} Mora memory for ${subject}.`,
    };
  });
}
