import fs from "fs";
import path from "path";

export type ModelProvider = "anthropic" | "openai";

export interface ModelInfo {
  id: string;
  label: string;
  provider: ModelProvider;
}

/**
 * Parse a "model1:Label 1,model2:Label 2" env string into structured entries.
 */
function parseModelList(raw: string | undefined, provider: ModelProvider): ModelInfo[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [id, label] = entry.split(":").map((s) => s.trim());
      return { id, label: label || id, provider };
    });
}

/**
 * Read env vars safely — falls back to reading .env.local directly if the
 * parent process blanked them (Claude Code does this for ANTHROPIC_API_KEY etc).
 */
function readEnv(key: string): string | undefined {
  const v = process.env[key];
  if (v && v.length > 0) return v;
  try {
    const envFile = fs.readFileSync(path.join(process.cwd(), ".env.local"), "utf-8");
    const match = envFile.match(new RegExp(`^${key}=(.+)$`, "m"));
    if (match) return match[1].trim();
  } catch {
    /* ignore */
  }
  return undefined;
}

/**
 * Get the full list of available models, combining Anthropic + OpenAI from env.
 */
export function getAvailableModels(): ModelInfo[] {
  const anthropic = parseModelList(readEnv("ANTHROPIC_MODELS"), "anthropic");
  const openai = parseModelList(readEnv("OPENAI_MODELS"), "openai");
  return [...anthropic, ...openai];
}

/**
 * Look up a model by ID. Returns undefined if not configured.
 */
export function getModel(id: string): ModelInfo | undefined {
  return getAvailableModels().find((m) => m.id === id);
}

/**
 * The default model to use when the user hasn't picked one.
 */
export function getDefaultModel(): ModelInfo {
  const all = getAvailableModels();
  const defaultId = readEnv("DEFAULT_CHAT_MODEL");
  if (defaultId) {
    const found = all.find((m) => m.id === defaultId);
    if (found) return found;
  }
  if (all.length === 0) {
    throw new Error(
      "No chat models configured. Set ANTHROPIC_MODELS or OPENAI_MODELS in .env.local"
    );
  }
  return all[0];
}

/**
 * Export the raw env reader so other modules (anthropic.ts, openai.ts) can use it.
 */
export { readEnv };
