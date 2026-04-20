import { anthropic } from "@/lib/anthropic";
import { buildExtractionPrompt } from "@/lib/prompts/extraction";
import type { ParsedConversation, ExtractedEntity } from "@/lib/vault/types";

/**
 * Extract entities from a batch of conversations using Claude Sonnet.
 */
export async function extractEntitiesFromBatch(
  conversations: ParsedConversation[]
): Promise<ExtractedEntity[]> {
  if (conversations.length === 0) return [];

  const prompt = buildExtractionPrompt(conversations);

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Extraction: no JSON array in response");
      return [];
    }

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) return [];

    // Validate and type the entities
    return parsed.filter(
      (e): e is ExtractedEntity =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as ExtractedEntity).type === "string" &&
        typeof (e as ExtractedEntity).slug === "string" &&
        typeof (e as ExtractedEntity).title === "string" &&
        typeof (e as ExtractedEntity).content === "string" &&
        Array.isArray((e as ExtractedEntity).links) &&
        Array.isArray((e as ExtractedEntity).tags)
    );
  } catch (error) {
    console.error("Entity extraction failed:", error);
    return [];
  }
}
