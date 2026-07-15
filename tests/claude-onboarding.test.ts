import { describe, expect, it } from "vitest";
import { CLAUDE_CONNECTOR_URL } from "@/lib/claude/connector";
import {
  CLAUDE_ENROLLMENT_PROMPT,
  CLAUDE_MEMORY_MIRROR_INSTRUCTION,
} from "@/lib/claude/enrollment-prompt";

describe("Claude connector onboarding prompt", () => {
  it("requests enrollment with explicit, scoped approval in one message", () => {
    expect(CLAUDE_ENROLLMENT_PROMPT).toContain("Enroll me in Mora");
    expect(CLAUDE_ENROLLMENT_PROMPT).toContain("context you can access");
    expect(CLAUDE_ENROLLMENT_PROMPT).toContain("I approve saving it");
    expect(CLAUDE_ENROLLMENT_PROMPT).toContain("future Claude memory updates");
    expect(CLAUDE_ENROLLMENT_PROMPT).not.toMatch(/^\//);
  });

  it("provides an account-wide instruction for implicit remember requests", () => {
    expect(CLAUDE_MEMORY_MIRROR_INSTRUCTION).toContain("normal Claude memory");
    expect(CLAUDE_MEMORY_MIRROR_INSTRUCTION).toContain("enabled Mora connector");
    expect(CLAUDE_MEMORY_MIRROR_INSTRUCTION).toContain("even when I do not mention Mora");
    expect(CLAUDE_MEMORY_MIRROR_INSTRUCTION).toContain("direct memory request is approval");
  });

  it("uses the canonical HTTPS connector endpoint", () => {
    expect(CLAUDE_CONNECTOR_URL).toBe("https://www.mymora.app/mcp");
  });
});
