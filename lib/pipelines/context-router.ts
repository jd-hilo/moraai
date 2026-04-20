import { buildContextRoutingPrompt } from "@/lib/prompts/context-routing";
import { readEnv } from "@/lib/models";
import type { Message } from "@/lib/vault/types";

/**
 * Call whichever provider is available (Anthropic Haiku first, OpenAI gpt-4o-mini fallback).
 */
async function callRouter(prompt: string): Promise<string> {
  // Try Anthropic first, fall through to OpenAI on any auth/API error
  const anthropicKey = readEnv("ANTHROPIC_API_KEY");
  if (anthropicKey) {
    try {
      const { anthropic } = await import("@/lib/anthropic");
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      });
      const block = response.content[0];
      return block.type === "text" ? block.text : "";
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401 || status === 403) {
        console.warn("[context-router] Anthropic auth failed, falling back to OpenAI");
      } else {
        throw err;
      }
    }
  }

  const openaiKey = readEnv("OPENAI_API_KEY");
  if (openaiKey) {
    const { openai } = await import("@/lib/openai");
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });
    return response.choices[0]?.message?.content ?? "";
  }

  throw new Error("No LLM provider configured for context routing.");
}

/**
 * Route context: given a user message, conversation history, the vault index,
 * and the list of actual vault file paths, determine which vault files to load.
 */
export async function routeContext(
  userMessage: string,
  conversationHistory: Message[],
  indexContent: string,
  availablePaths: string[] = []
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
    const text = await callRouter(prompt);

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
