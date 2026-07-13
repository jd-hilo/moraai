import { describe, expect, it } from "vitest";
import { CLAUDE_ENROLLMENT_PROMPT } from "@/lib/claude/enrollment-prompt";

describe("Claude connector onboarding prompt", () => {
  it("requests enrollment with explicit, scoped approval in one message", () => {
    expect(CLAUDE_ENROLLMENT_PROMPT).toContain("Enroll me in Mora");
    expect(CLAUDE_ENROLLMENT_PROMPT).toContain("context you can access");
    expect(CLAUDE_ENROLLMENT_PROMPT).toContain("I approve saving it");
    expect(CLAUDE_ENROLLMENT_PROMPT).not.toMatch(/^\//);
  });
});
