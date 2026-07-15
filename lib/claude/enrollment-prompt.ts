export const CLAUDE_ENROLLMENT_PROMPT =
  "Enroll me in Mora using the context you can access. I approve saving this snapshot to my Mora memory.";

export const CLAUDE_NIGHTLY_SYNC_PROMPT =
  "This is my approved recurring Mora backup task. Read the complete current Claude memory snapshot available to this task, then call Mora's sync_claude_memory exactly once with that snapshot. Include only durable stored Claude memory—not chat-only context, incognito content, hidden data, or inferences. If the snapshot is unavailable or Mora is disconnected, report that the backup could not run. Otherwise, report only whether Mora was updated or already current and the sync time. Do not change Claude memory or any account-wide instructions.";
