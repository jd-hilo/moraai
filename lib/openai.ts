import OpenAI from "openai";
import { readEnv } from "./models";

let _client: OpenAI | undefined;

function getClient(): OpenAI {
  if (_client) return _client;
  const apiKey = readEnv("OPENAI_API_KEY");
  if (!apiKey || apiKey.startsWith("PUT_")) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to .env.local and restart the dev server."
    );
  }
  _client = new OpenAI({ apiKey });
  return _client;
}

export const openai: OpenAI = new Proxy({} as OpenAI, {
  get(_t, prop) {
    const c = getClient();
    const value = (c as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? value.bind(c) : value;
  },
});
