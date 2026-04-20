import type { Message } from "@/lib/vault/types";

export function buildPostChatUpdatePrompt(
  transcript: Message[],
  indexContent: string,
  currentVaultFiles: Record<string, string>
): string {
  const transcriptText = transcript
    .map((m) => `${m.role}: ${m.content}`)
    .join("\n");

  const vaultFilesText = Object.entries(currentVaultFiles)
    .map(([path, content]) => `=== ${path} ===\n${content}`)
    .join("\n\n");

  return `You are a memory maintenance system for a personal AI called Mora. After each conversation, you analyze the transcript and decide what updates to make to the user's memory vault.

## Current Vault Index
${indexContent}

## Current Vault Files
${vaultFilesText}

## Conversation Transcript
${transcriptText}

## Your Task
Analyze this conversation and capture anything that reveals something about the user — their current state, mood, what they're up to, how they're feeling, what's on their mind, or anything factual about their life. Set the bar LOW. Even casual signals are worth recording.

What to capture (examples):
- Current mood or energy ("nothing much rn" → low-key day, relaxed state)
- What they're doing or not doing right now
- Offhand mentions of people, places, plans, or events
- Emotional tone — are they stressed, bored, content, distracted?
- Anything that updates or adds texture to an existing vault file
- New facts, even small ones

Rules:
- Prefer updating/appending existing files over creating new ones
- Use "append" to add a timestamped note to an existing file
- Use "update" with a section name to replace a specific section
- Use "create" only for entirely new topics with no existing file
- Keep content factual and in third person, brief
- Maintain the existing frontmatter format (YAML with title, type, tags, updated)
- Write a brief log entry summarizing what changed

Return ONLY a JSON object with this structure:
{
  "operations": [
    {
      "action": "create" | "update" | "append",
      "filepath": "category/slug.md",
      "content": "the content to write/append",
      "section": "section name if updating a specific section, or null"
    }
  ],
  "index_updates": [
    { "slug": "entity-slug", "summary": "One-line summary for index" }
  ],
  "log_entry": "Brief description of what was updated and why"
}

If the conversation is truly empty (only greetings, zero signal about the user), return:
{
  "operations": [],
  "index_updates": [],
  "log_entry": "No signal to record."
}`;
}
