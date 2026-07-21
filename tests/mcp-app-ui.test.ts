import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("MCP App host-safety regression guards", () => {
  it("keeps the generated single-file artifact inside the production budget", async () => {
    const artifact = await readFile(
      path.join(root, "mcp-apps/simulation-results/dist/index.html")
    );
    const source = artifact.toString("utf8");

    expect(artifact.byteLength).toBeLessThanOrEqual(408_500);
    expect(gzipSync(artifact).byteLength).toBeLessThanOrEqual(102_000);
    expect(source).not.toMatch(/data:(?:font|image)\//);
    expect(source).not.toContain("Recoleta-Regular.otf");
    expect(source).not.toContain("mora-logo.png");
  });

  it("keeps every required boot selector present with a meaningful fallback", async () => {
    const [html, script] = await Promise.all([
      readFile(path.join(root, "mcp-apps/simulation-results/index.html"), "utf8"),
      readFile(path.join(root, "mcp-apps/simulation-results/main.ts"), "utf8"),
    ]);
    const selectors = Array.from(
      script.matchAll(/document\.querySelector<[^>]+>\("([#.][^"]+)"\)!/g),
      (match) => match[1]
    );

    expect(selectors.length).toBeGreaterThan(8);
    for (const selector of selectors) {
      if (selector.startsWith("#")) expect(html).toContain(`id="${selector.slice(1)}"`);
      if (selector.startsWith(".")) expect(html).toContain(`class="${selector.slice(1)}`);
    }
    expect(html).toContain("Loading your possible futures");
    expect(html).toContain("<noscript>");
    expect(html).toContain('id="error" class="state error-state" role="alert" hidden');
  });

  it("uses the proven wide path grid and collapses safely for narrower hosts", async () => {
    const html = await readFile(
      path.join(root, "mcp-apps/simulation-results/index.html"),
      "utf8"
    );

    expect(html).toContain("max-width: 1180px");
    expect(html).toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    expect(html).toContain("grid-template-columns: minmax(190px, .82fr) minmax(0, 1.38fr)");
    expect(html).toContain("@media (max-width: 600px)");
    expect(html).toContain(".path-detail { display: block; }");
  });
});
