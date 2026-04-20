import Anthropic from "@anthropic-ai/sdk";
import { readEnv } from "./models";

let _client: Anthropic | undefined;

function getClient(): Anthropic {
  if (_client) return _client;
  const apiKey = readEnv("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server."
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export const anthropic: Anthropic = new Proxy({} as Anthropic, {
  get(_t, prop) {
    const c = getClient();
    const value = (c as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(c) : value;
  },
});
