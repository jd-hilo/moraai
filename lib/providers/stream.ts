import { anthropic } from "@/lib/anthropic";
import { openai } from "@/lib/openai";
import { getModel, getDefaultModel, type ModelInfo } from "@/lib/models";

export interface StreamUsage {
  inputTokens: number;
  outputTokens: number;
  model: string;
}

export interface StreamChatParams {
  modelId: string;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
  /**
   * Fires once when the stream finishes with token usage reported by the
   * provider. Used by the credit system to charge per-message.
   */
  onUsage?: (usage: StreamUsage) => void;
}

/**
 * Stream chat completions from either Anthropic or OpenAI based on the model ID.
 * Yields plain text chunks for the caller to forward to the client. When the
 * stream finishes, `onUsage` is called with the provider-reported token counts.
 */
export async function* streamChat(params: StreamChatParams): AsyncGenerator<string> {
  const model: ModelInfo = getModel(params.modelId) ?? getDefaultModel();
  const maxTokens = params.maxTokens ?? 4096;

  if (model.provider === "anthropic") {
    const stream = await anthropic.messages.create({
      model: model.id,
      max_tokens: maxTokens,
      system: params.system,
      messages: params.messages,
      stream: true,
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of stream) {
      if (event.type === "message_start") {
        inputTokens = event.message.usage?.input_tokens ?? 0;
        outputTokens = event.message.usage?.output_tokens ?? 0;
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      } else if (event.type === "message_delta") {
        // Final usage arrives in the message_delta event.
        outputTokens = event.usage?.output_tokens ?? outputTokens;
      }
    }

    params.onUsage?.({ inputTokens, outputTokens, model: model.id });
    return;
  }

  if (model.provider === "openai") {
    const stream = await openai.chat.completions.create({
      model: model.id,
      stream: true,
      stream_options: { include_usage: true },
      messages: [
        { role: "system", content: params.system },
        ...params.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_completion_tokens: maxTokens,
    });

    let inputTokens = 0;
    let outputTokens = 0;

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
      // The final chunk (with include_usage) contains `usage` at top level.
      if (chunk.usage) {
        inputTokens = chunk.usage.prompt_tokens ?? 0;
        outputTokens = chunk.usage.completion_tokens ?? 0;
      }
    }

    params.onUsage?.({ inputTokens, outputTokens, model: model.id });
    return;
  }

  throw new Error(`Unknown model provider: ${model.provider satisfies never}`);
}
