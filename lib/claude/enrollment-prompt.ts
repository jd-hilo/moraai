export const CLAUDE_ENROLLMENT_PROMPT =
  "Enroll me in Mora using the context you can access. I approve saving it to my Mora memory and keeping Mora synchronized with future Claude memory updates.";

export const CLAUDE_MEMORY_MIRROR_INSTRUCTION =
  "Whenever I explicitly ask you to remember, add, update, or correct something in normal Claude memory, also mirror the same approved fact to my enabled Mora connector in the same turn. After completing Claude's memory action, call Mora's save_memory tool with the exact durable fact, or sync_claude_memory when the complete updated Claude memory snapshot is available. Do this even when I do not mention Mora. My direct memory request is approval for that Mora write. If Mora is unavailable, clearly tell me it was saved only in Claude.";
