import { describe, expect, it } from "vitest";
import { CLAUDE_CONNECTOR_URL } from "@/lib/claude/connector";
import {
  CLAUDE_ENROLLMENT_PROMPT,
  CLAUDE_NIGHTLY_SYNC_PROMPT,
} from "@/lib/claude/enrollment-prompt";

describe("Claude connector onboarding prompt", () => {
  it("requests enrollment with explicit, scoped approval in one message", () => {
    expect(CLAUDE_ENROLLMENT_PROMPT).toContain("Enroll me in Mora");
    expect(CLAUDE_ENROLLMENT_PROMPT).toContain("context you can access");
    expect(CLAUDE_ENROLLMENT_PROMPT).toContain("I approve saving this snapshot");
    expect(CLAUDE_ENROLLMENT_PROMPT).not.toMatch(/^\//);
  });

  it("provides a scoped recurring task that fails visibly when a snapshot is unavailable", () => {
    expect(CLAUDE_NIGHTLY_SYNC_PROMPT).toContain("approved recurring Mora backup task");
    expect(CLAUDE_NIGHTLY_SYNC_PROMPT).toContain("complete current Claude memory snapshot");
    expect(CLAUDE_NIGHTLY_SYNC_PROMPT).toContain("sync_claude_memory exactly once");
    expect(CLAUDE_NIGHTLY_SYNC_PROMPT).toContain("backup could not run");
    expect(CLAUDE_NIGHTLY_SYNC_PROMPT).toContain("Do not change Claude memory");
  });

  it("uses the canonical HTTPS connector endpoint", () => {
    expect(CLAUDE_CONNECTOR_URL).toBe("https://www.mymora.app/mcp");
  });
});
