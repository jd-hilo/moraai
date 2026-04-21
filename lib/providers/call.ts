import { readEnv } from "@/lib/models";
import { chargeUsage } from "@/lib/credits";

interface CallParams {
  /** Model preferences in priority order. First available key + model is used. */
  anthropicModel?: string;
  openaiModel?: string;
  prompt: string;
  maxTokens?: number;
  system?: string;
  /**
   * If provided, credits are charged to this user for the resulting call.
   * Use `action` to label the ledger entry (e.g. "simulation.lens").
   */
  userId?: string;
  action?: string;
}

export interface CallResult {
  text: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/**
 * Single-shot (non-streaming) LLM call with Anthropic→OpenAI fallback.
 * Shared by all simulation + routing pipelines.
 *
 * When `userId` is supplied, this function also charges credits based on
 * the real token counts reported by the provider. This keeps all usage
 * accounting centralized — callers don't need to know model pricing.
 */
export async function callLLMDetailed(params: CallParams): Promise<CallResult> {
  const maxTokens = params.maxTokens ?? 2048;

  const anthropicKey = readEnv("ANTHROPIC_API_KEY");
  if (anthropicKey && params.anthropicModel) {
    try {
      const { anthropic } = await import("@/lib/anthropic");
      const resp = await anthropic.messages.create({
        model: params.anthropicModel,
        max_tokens: maxTokens,
        system: params.system,
        messages: [{ role: "user", content: params.prompt }],
      });
      const block = resp.content[0];
      const text = block?.type === "text" ? block.text : "";
      const inputTokens = resp.usage?.input_tokens ?? 0;
      const outputTokens = resp.usage?.output_tokens ?? 0;
      if (params.userId && params.action) {
        chargeUsage({
          userId: params.userId,
          action: params.action,
          model: params.anthropicModel,
          inputTokens,
          outputTokens,
        }).catch((e) => console.error("[credits] charge failed:", e));
      }
      return { text, model: params.anthropicModel, inputTokens, outputTokens };
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 401 || status === 403) {
        console.warn("[callLLM] Anthropic auth failed, falling back to OpenAI");
      } else {
        throw err;
      }
    }
  }

  const openaiKey = readEnv("OPENAI_API_KEY");
  if (openaiKey && params.openaiModel) {
    const { openai } = await import("@/lib/openai");
    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (params.system) messages.push({ role: "system", content: params.system });
    messages.push({ role: "user", content: params.prompt });
    const resp = await openai.chat.completions.create({
      model: params.openaiModel,
      max_completion_tokens: maxTokens,
      messages,
    });
    const text = resp.choices[0]?.message?.content ?? "";
    const inputTokens = resp.usage?.prompt_tokens ?? 0;
    const outputTokens = resp.usage?.completion_tokens ?? 0;
    if (params.userId && params.action) {
      chargeUsage({
        userId: params.userId,
        action: params.action,
        model: params.openaiModel,
        inputTokens,
        outputTokens,
      }).catch((e) => console.error("[credits] charge failed:", e));
    }
    return { text, model: params.openaiModel, inputTokens, outputTokens };
  }

  throw new Error("No LLM provider available (checked Anthropic + OpenAI).");
}

/** Backwards-compatible shim: returns just the text string. */
export async function callLLM(params: CallParams): Promise<string> {
  const { text } = await callLLMDetailed(params);
  return text;
}
