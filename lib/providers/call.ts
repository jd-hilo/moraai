import { readEnv } from "@/lib/models";

interface CallParams {
  /** Model preferences in priority order. First available key + model is used. */
  anthropicModel?: string;
  openaiModel?: string;
  prompt: string;
  maxTokens?: number;
  system?: string;
}

/**
 * Single-shot (non-streaming) LLM call with Anthropic→OpenAI fallback.
 * Shared by all simulation pipelines. Mirrors the retry pattern in
 * `lib/pipelines/context-router.ts` and `lib/pipelines/post-chat-ingest.ts`.
 */
export async function callLLM(params: CallParams): Promise<string> {
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
      if (block?.type === "text") return block.text;
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
    return resp.choices[0]?.message?.content ?? "";
  }

  throw new Error("No LLM provider available (checked Anthropic + OpenAI).");
}
