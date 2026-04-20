import type { ExtractedEntity } from "@/lib/vault/types";

export function buildMergePrompt(entities: ExtractedEntity[]): string {
  const entityJson = JSON.stringify(entities, null, 2);

  return `You are a knowledge deduplication and merging expert. You have been given a list of extracted entities about a user from multiple conversation batches.

Your job:
1. **Merge duplicates**: If two entities describe the same person/topic/goal, merge them into one with combined content
2. **Resolve conflicts**: If there are contradictions, prefer the more specific or recent information
3. **Fix links**: Ensure all "links" fields reference valid slugs that exist in your output
4. **Clean up**: Remove any entities that are too vague or have no meaningful content
5. **Detect user name**: If the user's name appears anywhere, note it

Return a JSON object with this structure:
{
  "entities": [ ...merged entities array... ],
  "user_name": "detected name or null"
}

Each entity must have: type, slug, title, content, links (array of slugs), tags (array of strings).

Here are the entities to merge:

${entityJson}`;
}
