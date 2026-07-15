export const CLAUDE_ENROLLMENT_PROMPT =
  "Enroll me in Mora using the context you can access. I approve saving it to my Mora memory and keeping Mora synchronized with future Claude memory updates.";

export const CLAUDE_MEMORY_MIRROR_INSTRUCTION =
  "In my account, the phrase 'remember X' means one direct command: store X in both normal Claude memory and my enabled Mora connector. This is not blanket approval inferred from ordinary conversation; each command names the exact fact and both destinations. After completing Claude's memory action, call Mora's mirror_claude_memory_fact tool with X in the same turn, even when I do not repeat the word Mora or Claude already had X. Do not ask for another confirmation. If Mora is unavailable, clearly tell me it was saved only in Claude.";
