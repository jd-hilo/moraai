import { anthropic } from "@/lib/anthropic";
import { openai } from "@/lib/openai";
import { getModel, getDefaultModel, type ModelInfo } from "@/lib/models";

export interface StreamChatParams {
  modelId: string;
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  maxTokens?: number;
}

/**
 * Stream chat completions from either Anthropic or OpenAI based on the model ID.
 * Yields plain text chunks for the caller to forward to the client.
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

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield event.delta.text;
      }
    }
    return;
  }

  if (model.provider === "openai") {
    // OpenAI wants system prompt as the first message with role "system"
    const stream = await openai.chat.completions.create({
      model: model.id,
      stream: true,
      messages: [
        { role: "system", content: params.system },
        ...params.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
      max_completion_tokens: maxTokens,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) yield text;
    }
    return;
  }

  throw new Error(`Unknown model provider: ${model.provider satisfies never}`);
}
