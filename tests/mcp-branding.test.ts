import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/.well-known/oauth-protected-resource/mcp/route";

const CREATE_NEXT_APP_FAVICON_SHA256 =
  "2b8ad2d33455a8f736fc3a8ebf8f0bdea8848ad4c0db48a2833bd0f9cd775932";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("MCP branding", () => {
  it("advertises Mora as the protected resource name", async () => {
    const clerkFrontendApi = Buffer.from("clerk.mora.test$").toString("base64");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", `pk_test_${clerkFrontendApi}`);

    const response = GET(
      new Request(
        "https://www.mymora.app/.well-known/oauth-protected-resource/mcp"
      )
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      resource: "https://www.mymora.app",
      resource_name: "Mora",
      scopes_supported: ["profile", "email"],
    });
  });

  it("does not serve the create-next-app favicon for Mora", async () => {
    const favicon = await readFile(path.join(process.cwd(), "app/favicon.ico"));
    const digest = createHash("sha256").update(favicon).digest("hex");

    expect(favicon.subarray(0, 4)).toEqual(Buffer.from([0, 0, 1, 0]));
    expect(favicon.readUInt16LE(4)).toBeGreaterThan(0);
    expect(digest).not.toBe(CREATE_NEXT_APP_FAVICON_SHA256);
  });
});
