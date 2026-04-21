import { anthropic } from "@/lib/anthropic";
import { buildExtractionPrompt } from "@/lib/prompts/extraction";
import { chargeUsage } from "@/lib/credits";
import type { ParsedConversation, ExtractedEntity } from "@/lib/vault/types";

const MODEL = "claude-haiku-4-5-20251001";

/**
 * Extract entities from a batch of conversations using Claude Haiku.
 * When `userId` is supplied, the call's token usage is charged against the
 * user's weekly credit balance.
 */
export async function extractEntitiesFromBatch(
  conversations: ParsedConversation[],
  userId?: string
): Promise<ExtractedEntity[]> {
  if (conversations.length === 0) return [];

  const prompt = buildExtractionPrompt(conversations);

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    // Charge credits for this call (fire-and-forget; don't block on billing).
    if (userId) {
      chargeUsage({
        userId,
        action: "import.extract",
        model: MODEL,
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      }).catch((err) =>
        console.error("[credits] extract charge failed:", err)
      );
    }

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
