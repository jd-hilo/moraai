import { describe, expect, it, vi } from "vitest";
import type { AuthInfo } from "@modelcontextprotocol/sdk/server/auth/types.js";

vi.mock("@/lib/mcp/tools", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/mcp/tools")>();
  return { ...original, registerMoraTools: vi.fn() };
});
vi.mock("@clerk/nextjs/server", () => ({ auth: vi.fn().mockResolvedValue({}) }));
vi.mock("@clerk/mcp-tools/next", async (importOriginal) => {
  const original = await importOriginal<typeof import("@clerk/mcp-tools/next")>();
  return { ...original, verifyClerkToken: vi.fn(() => undefined) };
});

import { clerkUserIdFromAuth } from "@/lib/mcp/tools";
import { selectRelevantMemory } from "@/lib/mcp/memory";
import { POST } from "@/app/mcp/route";

describe("MCP contract", () => {
  it("fails closed when Clerk auth metadata has no user ID", () => {
    expect(() => clerkUserIdFromAuth(undefined)).toThrow();
    expect(() => clerkUserIdFromAuth({ extra: {} } as AuthInfo)).toThrow();
  });

  it("caps returned private context and clearly delimits memory records", () => {
    const recalled = selectRelevantMemory(
      "research",
      { "goals/research.md": `Research ${"a".repeat(200)}` },
      8,
      20
    );
    expect(recalled.memory.length).toBeLessThanOrEqual(100);
    expect(recalled.memory).toContain("<memory_record>");
    expect(recalled.memory).toContain("[truncated]");
  });

  it("rejects unauthenticated MCP requests with OAuth discovery metadata", async () => {
    const response = await POST(
      new Request("https://mora.example/mcp", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
      })
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain(
      "/.well-known/oauth-protected-resource/mcp"
    );
  });

  it("fails closed when a bearer token is invalid or expired", async () => {
    const response = await POST(
      new Request("https://mora.example/mcp", {
        method: "POST",
        headers: {
          authorization: "Bearer expired-token",
          "content-type": "application/json",
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: {} }),
      })
    );
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("invalid_token");
  });
});
