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

    expect(artifact.byteLength).toBe(442_132);
    expect(gzipSync(artifact).byteLength).toBeLessThanOrEqual(116_000);
    expect(createHash("sha256").update(artifact).digest("hex")).toBe(
      "2b95f3860d9ff493a425afa0258be1267a31d9455894afcf2db22a6a14f1c3dd"
    );
    const imageDataUrls = source.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/g) ?? [];
    expect(new Set(imageDataUrls).size).toBe(1);
    expect(imageDataUrls).toHaveLength(2);
    expect(Buffer.from(imageDataUrls[0]!.split(",")[1]!, "base64").byteLength).toBeLessThanOrEqual(
      12_000
    );
    expect(source).not.toContain("Recoleta-Regular.otf");
    expect(source).not.toContain("mora-logo.png");
    expect(source).not.toContain("fonts.googleapis.com");
    expect(source).not.toContain("fonts.gstatic.com");
    expect(source).not.toContain("data:font/");
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
    expect(html).toContain('alt="Mora"');
    expect(html).not.toMatch(/>Mora simulation<|>simulation</);
    expect(html).not.toContain("<noscript>");
    expect(html).not.toMatch(/<p[^>]+style=/);
    expect(html).toContain('id="error" class="state error-state" role="alert" hidden');
  });

  it("animates a bounded landing-page twin cluster without host-heavy runtime work", async () => {
    const [html, script] = await Promise.all([
      readFile(path.join(root, "mcp-apps/simulation-results/index.html"), "utf8"),
      readFile(path.join(root, "mcp-apps/simulation-results/main.ts"), "utf8"),
    ]);

    expect(html.match(/class="twin"/g) ?? []).toHaveLength(36);
    expect(html).toContain("contain: layout paint");
    expect(html).not.toContain("filter:");
    expect(html).toContain("@media (prefers-reduced-motion: reduce), (update: slow)");
    expect(html).toContain(".twin { animation: none; }");
    expect(html).toContain("Exploring other possible versions of you.");
    expect(html).not.toContain("Simulation in progress");
    expect(html).not.toContain("Mora is running possible paths in parallel");
    expect(html).not.toContain("This can take a few minutes");
    expect(html).not.toContain("<canvas");
    expect(html).not.toContain("<video");
    expect(script).not.toMatch(/setInterval|setTimeout/);
    expect(script.match(/requestAnimationFrame/g) ?? []).toHaveLength(1);
  });

  it("keeps the authored body deterministic", async () => {
    const html = await readFile(
      path.join(root, "mcp-apps/simulation-results/index.html"),
      "utf8"
    );
    const body = html.slice(html.indexOf("<body>"), html.indexOf("</body>") + 7);

    expect(createHash("sha256").update(body).digest("hex")).toBe(
      "91fb422ee203022ee143d6411366ab3ccb55d90df21a532c13214129ccc04edc"
    );
  });

  it("keeps a calm horizontal path flow and a composer-safe reading view", async () => {
    const [html, script] = await Promise.all([
      readFile(path.join(root, "mcp-apps/simulation-results/index.html"), "utf8"),
      readFile(path.join(root, "mcp-apps/simulation-results/main.ts"), "utf8"),
    ]);

    expect(html).toContain("max-width: 1040px");
    expect(html).not.toContain("explorer-grid");
    expect(html).toContain("flex: 0 0 clamp(174px, 29vw, 226px)");
    expect(html).not.toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    expect(html).toContain("height: 222px");
    expect(html).not.toContain('class="premise"');
    expect(html).not.toContain('id="synthesis-panel"');
    expect(html).toContain(".detail-topline");
    expect(html).toContain(".path-summary");
    expect(html).toContain("-webkit-line-clamp: 2");
    expect(html).toContain('html[data-display-mode="fullscreen"] .path-summary { display: none; }');
    expect(script).toContain('summary.textContent = path.description');
    expect(html).toContain("padding-bottom: max(260px, calc(var(--host-safe-bottom) + env(safe-area-inset-bottom) + 220px))");
    expect(html).toContain("@media (max-width: 560px)");
    expect(html).toContain(".header-main { grid-template-columns: 1fr; gap: 14px; }");
    expect(html).toContain('html[data-display-mode="fullscreen"] .path-browser { display: none; }');
  });
});
