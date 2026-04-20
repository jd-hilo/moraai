import type { MergedEntity, VaultFile, VaultOperations } from "./types";

/**
 * Generate frontmatter string from entity metadata.
 */
function buildFrontmatter(entity: MergedEntity): string {
  const lines = ["---"];
  lines.push(`title: "${entity.title}"`);
  lines.push(`type: ${entity.type}`);
  if (entity.tags.length > 0) {
    lines.push(`tags: [${entity.tags.join(", ")}]`);
  }
  lines.push(`updated: ${new Date().toISOString().split("T")[0]}`);
  lines.push("---");
  return lines.join("\n");
}

/**
 * Determine the directory for an entity based on its type.
 */
function typeToDirectory(type: string): string {
  const typeMap: Record<string, string> = {
    identity: "identity",
    people: "people",
    goals: "goals",
    patterns: "patterns",
    life: "life",
    decisions: "decisions",
  };
  return typeMap[type] || "misc";
}

/**
 * Convert links array to wikilink references in content.
 */
function addWikilinks(content: string, links: string[]): string {
  let result = content;
  for (const link of links) {
    // If the link text appears in the content but isn't already a wikilink, wrap it
    const plainText = link.replace(/-/g, " ");
    const wikilink = `[[${plainText}]]`;
    if (!result.includes(wikilink)) {
      // Replace first occurrence of the plain text with a wikilink
      const regex = new RegExp(`(?<!\[\[)${escapeRegex(plainText)}(?!\]\])`, "i");
      result = result.replace(regex, wikilink);
    }
  }
  return result;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generate vault markdown files from merged entities.
 */
export function generateVaultFiles(entities: MergedEntity[]): VaultFile[] {
  const files: VaultFile[] = [];

  // Generate index file
  const indexLines = ["# Vault Index", ""];
  const groupedByType: Record<string, MergedEntity[]> = {};

  for (const entity of entities) {
    if (!groupedByType[entity.type]) {
      groupedByType[entity.type] = [];
    }
    groupedByType[entity.type].push(entity);
  }

  for (const [type, typeEntities] of Object.entries(groupedByType)) {
    indexLines.push(`## ${type.charAt(0).toUpperCase() + type.slice(1)}`);
    for (const entity of typeEntities) {
      const summary = entity.content.split("\n")[0].slice(0, 80);
      const dir = typeToDirectory(entity.type);
      const filepath = `${dir}/${entity.slug}.md`;
      indexLines.push(`- [[${entity.title}]] (\`${filepath}\`): ${summary}`);
    }
    indexLines.push("");
  }

  files.push({ path: "_index.md", content: indexLines.join("\n") });

  // Generate entity files
  for (const entity of entities) {
    const dir = typeToDirectory(entity.type);
    const frontmatter = buildFrontmatter(entity);
    const contentWithLinks = addWikilinks(entity.content, entity.links);
    const fullContent = `${frontmatter}\n\n${contentWithLinks}`;
    const filepath = `${dir}/${entity.slug}.md`;
    files.push({ path: filepath, content: fullContent });
  }

  // Generate empty log file
  files.push({
    path: "_log.md",
    content: `# Conversation Log\n\nRecent conversation updates will appear here.\n`,
  });

  return files;
}

/**
 * Apply vault operations (create/update/append) to a set of vault files.
 */
export function applyVaultOperations(
  currentFiles: Record<string, string>,
  ops: VaultOperations
): Record<string, string> {
  const result = { ...currentFiles };

  for (const op of ops.operations) {
    switch (op.action) {
      case "create":
        result[op.filepath] = op.content;
        break;

      case "update":
        if (op.section && result[op.filepath]) {
          // Replace a specific section in the file
          const existing = result[op.filepath];
          const sectionHeader = `## ${op.section}`;
          const sectionIndex = existing.indexOf(sectionHeader);

          if (sectionIndex !== -1) {
            // Find the next section header or end of file
            const afterSection = existing.slice(sectionIndex + sectionHeader.length);
            const nextSectionMatch = afterSection.match(/\n## /);
            const endOfSection = nextSectionMatch
              ? sectionIndex + sectionHeader.length + (nextSectionMatch.index || 0)
              : existing.length;

            result[op.filepath] =
              existing.slice(0, sectionIndex) +
              sectionHeader +
              "\n" +
              op.content +
              "\n" +
              existing.slice(endOfSection);
          } else {
            // Section not found, append it
            result[op.filepath] = existing + "\n\n" + sectionHeader + "\n" + op.content + "\n";
          }
        } else {
          // Full file replace
          result[op.filepath] = op.content;
        }
        break;

      case "append":
        if (result[op.filepath]) {
          result[op.filepath] = result[op.filepath] + "\n" + op.content;
        } else {
          result[op.filepath] = op.content;
        }
        break;
    }
  }

  // Apply index updates
  if (ops.index_updates.length > 0 && result["_index.md"]) {
    let indexContent = result["_index.md"];
    for (const update of ops.index_updates) {
      const entryPattern = new RegExp(`- \\[\\[.*${escapeRegex(update.slug)}.*\\]\\]:.*`, "i");
      const newEntry = `- [[${update.slug}]]: ${update.summary}`;
      if (entryPattern.test(indexContent)) {
        indexContent = indexContent.replace(entryPattern, newEntry);
      } else {
        // Append to end of index
        indexContent = indexContent.trimEnd() + "\n" + newEntry + "\n";
      }
    }
    result["_index.md"] = indexContent;
  }

  // Append log entry
  if (ops.log_entry && result["_log.md"]) {
    const timestamp = new Date().toISOString();
    result["_log.md"] =
      result["_log.md"] + `\n## ${timestamp}\n${ops.log_entry}\n`;
  }

  return result;
}
