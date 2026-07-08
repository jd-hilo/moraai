import { buildContextRoutingPrompt } from "@/lib/prompts/context-routing";
import { callLLM } from "@/lib/providers/call";
import type { Message } from "@/lib/vault/types";

export interface ContextRoutingUsage {
  userId: string;
  action: "context.route" | "mcp.recall";
}

/**
 * Route context: given a user message, conversation history, the vault index,
 * and the list of actual vault file paths, determine which vault files to load.
 */
export async function routeContext(
  userMessage: string,
  conversationHistory: Message[],
  indexContent: string,
  availablePaths: string[] = [],
  usage?: ContextRoutingUsage
): Promise<string[]> {
  if (!indexContent.trim() && availablePaths.length === 0) {
    return [];
  }

  const prompt = buildContextRoutingPrompt(
    userMessage,
    conversationHistory,
    indexContent,
    availablePaths
  );

  try {
    const text = await callLLM({
      anthropicModel: "claude-haiku-4-5-20251001",
      openaiModel: "gpt-4o",
      prompt,
      maxTokens: 1024,
      userId: usage?.userId,
      action: usage?.action,
    });

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("[context-router] no JSON array in response:", text.slice(0, 200));
      return [];
    }

    const files: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(files)) return [];

    const pathSet = new Set(availablePaths);
    const picked = files.filter((f): f is string => typeof f === "string");
    const valid = availablePaths.length > 0 ? picked.filter((p) => pathSet.has(p)) : picked;

    console.log(
      `[context-router] msg="${userMessage.slice(0, 40)}" picked=${valid.length}`,
      valid
    );
    return valid;
  } catch (error) {
    console.error("[context-router] failed:", error);
    return [];
  }
}
