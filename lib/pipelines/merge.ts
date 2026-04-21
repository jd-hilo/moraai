import { anthropic } from "@/lib/anthropic";
import { buildMergePrompt } from "@/lib/prompts/merge";
import { chargeUsage } from "@/lib/credits";
import type { ExtractedEntity, MergedEntity } from "@/lib/vault/types";

const MODEL = "claude-haiku-4-5-20251001";

/**
 * Merge and deduplicate extracted entities using Claude Haiku.
 * When `userId` is supplied, the call's token usage is charged against the
 * user's weekly credit balance.
 */
export async function mergeEntities(
  entities: ExtractedEntity[],
  userId?: string
): Promise<{ entities: MergedEntity[]; user_name: string | null }> {
  if (entities.length === 0) {
    return { entities: [], user_name: null };
  }

  // If few entities, skip merge step
  if (entities.length <= 5) {
    return { entities, user_name: null };
  }

  const prompt = buildMergePrompt(entities);

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    if (userId) {
      chargeUsage({
        userId,
        action: "import.merge",
        model: MODEL,
        inputTokens: response.usage?.input_tokens ?? 0,
        outputTokens: response.usage?.output_tokens ?? 0,
      }).catch((err) =>
        console.error("[credits] merge charge failed:", err)
      );
    }

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Extract JSON object from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Merge: no JSON in response");
      return { entities, user_name: null };
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      entities?: unknown[];
      user_name?: string | null;
    };

    if (!parsed.entities || !Array.isArray(parsed.entities)) {
      return { entities, user_name: parsed.user_name || null };
    }

    const mergedEntities = parsed.entities.filter(
      (e): e is MergedEntity =>
        typeof e === "object" &&
        e !== null &&
        typeof (e as MergedEntity).type === "string" &&
        typeof (e as MergedEntity).slug === "string" &&
        typeof (e as MergedEntity).title === "string" &&
        typeof (e as MergedEntity).content === "string" &&
        Array.isArray((e as MergedEntity).links) &&
        Array.isArray((e as MergedEntity).tags)
    );

    return {
      entities: mergedEntities,
      user_name: typeof parsed.user_name === "string" ? parsed.user_name : null,
    };
  } catch (error) {
    console.error("Entity merge failed:", error);
    return { entities, user_name: null };
  }
}
