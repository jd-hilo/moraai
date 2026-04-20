import type { Message } from "@/lib/vault/types";

export function buildContextRoutingPrompt(
  userMessage: string,
  conversationHistory: Message[],
  indexContent: string,
  availablePaths: string[] = []
): string {
  const recentHistory = conversationHistory
    .slice(-6)
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const pathList = availablePaths.length
    ? availablePaths.map((p) => `- ${p}`).join("\n")
    : "(no files available)";

  return `You are a context router for a personal AI assistant. Given the user's message, conversation history, a vault index (human titles), and a list of ACTUAL FILE PATHS on disk, pick which files to load as context.

## Available File Paths (pick ONLY from this list)
${pathList}

## Vault Index (titles → summaries, for reference)
${indexContent}

## Recent Conversation
${recentHistory}

## Current User Message
${userMessage}

## Instructions
Return a JSON array of file paths (strings) that should be loaded to answer this message well.
- CRITICAL: every path in your output must appear verbatim in "Available File Paths" above. Do not invent paths.
- Include files directly relevant to the topic, plus closely related context files.
- If the user asks about themselves ("who am I", "tell me about me"), include identity/* and a few high-level life/* files.
- If the message is a greeting or casual opener ("hi", "hey", "what's up", "how are you"), load the top identity/* file and 1–2 high-level life/* files so the response feels personal.
- Maximum 8 files — prioritize the most relevant.
- Return ONLY the JSON array, no prose.

Example: ["identity/core-values.md", "people/partner-alex.md", "goals/career-transition.md"]`;
}
