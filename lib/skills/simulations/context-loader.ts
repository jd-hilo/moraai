import {
  readVaultFile,
  readMultipleVaultFiles,
  listVaultFiles,
} from "@/lib/vault/storage";
import { routeContext } from "@/lib/pipelines/context-router";
import { truncateToTokens } from "@/lib/utils";

/**
 * Load the user's vault context for a simulation. Pulls the index + all
 * `people/*` files unconditionally (since lenses are drawn from people),
 * then uses the context router to pick additional relevant files based on
 * the scenario.
 *
 * Returns a concatenated string ready to inject into prompts.
 */
export async function loadSimulationContext(
  vaultPath: string,
  scenario: string,
  narrative: string | null,
  maxTokens = 8000
): Promise<string> {
  const indexContent = await readVaultFile(vaultPath, "_index.md").catch(() => "");

  const allFiles = await listVaultFiles(vaultPath);
  const mdFiles = allFiles.filter((p) => p.endsWith(".md") && !p.startsWith("_"));

  // Always include every people/* file — lenses lean on these.
  const peopleFiles = mdFiles.filter((p) => p.startsWith("people/"));

  // Router picks additional relevant files beyond people/*.
  const extra = await routeContext(
    scenario + (narrative ? `\n\n${narrative}` : ""),
    [],
    indexContent,
    mdFiles
  ).catch(() => [] as string[]);

  const selectedFiles = Array.from(new Set([...peopleFiles, ...extra]));
  if (selectedFiles.length === 0 && !indexContent) return "";

  const fileContents = await readMultipleVaultFiles(vaultPath, selectedFiles);
  const parts: string[] = [];
  if (indexContent) parts.push(`### _index.md\n${indexContent}`);
  for (const [filename, content] of Object.entries(fileContents)) {
    parts.push(`### ${filename}\n${content}`);
  }
  return truncateToTokens(parts.join("\n\n"), maxTokens);
}
