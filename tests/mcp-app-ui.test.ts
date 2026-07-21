import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
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

    expect(artifact.byteLength).toBe(409_150);
    expect(gzipSync(artifact).byteLength).toBeLessThanOrEqual(102_000);
    expect(createHash("sha256").update(artifact).digest("hex")).toBe(
      "77bac8148ed1b46f4292c039e5cf2c8b3fda75731f1a2c82e65ed0927b30401f"
    );
    expect(source).not.toMatch(/data:(?:font|image)\//);
    expect(source).not.toContain("Recoleta-Regular.otf");
    expect(source).not.toContain("mora-logo.png");
    expect(source).not.toContain("fonts.googleapis.com");
    expect(source).not.toContain("fonts.gstatic.com");
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
    expect(html).toContain('aria-label="Loading simulation results"');
    expect(html).toContain("Mora simulation");
    expect(html).not.toContain("<noscript>");
    expect(html).not.toMatch(/<p[^>]+style=/);
    expect(html).toContain('id="error" class="state error-state" role="alert" hidden');
  });

  it("keeps the authored body on the production-proven boot structure", async () => {
    const html = await readFile(
      path.join(root, "mcp-apps/simulation-results/index.html"),
      "utf8"
    );
    const body = html.slice(html.indexOf("<body>"), html.indexOf("</body>") + 7);

    expect(createHash("sha256").update(body).digest("hex")).toBe(
      "2ef4d30e51b6c112c6ef354f7cbd378d384bb3c566008e969d5b185240748459"
    );
  });

  it("keeps the proven narrow document flow and collapses safely for smaller hosts", async () => {
    const html = await readFile(
      path.join(root, "mcp-apps/simulation-results/index.html"),
      "utf8"
    );

    expect(html).toContain(".content { padding: 22px 28px 30px; }");
    expect(html).not.toContain("max-width: 1180px");
    expect(html).not.toContain("explorer-grid");
    expect(html).toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    expect(html).toContain("grid-template-columns: minmax(190px, .82fr) minmax(0, 1.38fr)");
    expect(html).toContain("@media (max-width: 600px)");
    expect(html).toContain(".path-detail { display: block; }");
  });
});
