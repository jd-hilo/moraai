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

    expect(artifact.byteLength).toBe(435_772);
    expect(gzipSync(artifact).byteLength).toBeLessThanOrEqual(116_000);
    expect(createHash("sha256").update(artifact).digest("hex")).toBe(
      "d86b9a5fa6492c0456853a3fd18726eb9f433963a0399349530e8351bbfbb0ff"
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

  it("keeps the authored body deterministic", async () => {
    const html = await readFile(
      path.join(root, "mcp-apps/simulation-results/index.html"),
      "utf8"
    );
    const body = html.slice(html.indexOf("<body>"), html.indexOf("</body>") + 7);

    expect(createHash("sha256").update(body).digest("hex")).toBe(
      "cc150b3ae9952784908505a6fd146eccbe575268079a5d2d6c8180c43edcbd32"
    );
  });

  it("keeps a calm horizontal path flow and a composer-safe reading view", async () => {
    const html = await readFile(
      path.join(root, "mcp-apps/simulation-results/index.html"),
      "utf8"
    );

    expect(html).toContain("max-width: 1040px");
    expect(html).not.toContain("explorer-grid");
    expect(html).toContain("flex: 0 0 clamp(174px, 29vw, 226px)");
    expect(html).not.toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    expect(html).toContain("height: 222px");
    expect(html).not.toContain('class="premise"');
    expect(html).not.toContain('id="synthesis-panel"');
    expect(html).toContain("padding-bottom: max(260px, calc(var(--host-safe-bottom) + env(safe-area-inset-bottom) + 220px))");
    expect(html).toContain("@media (max-width: 560px)");
    expect(html).toContain(".header-main { grid-template-columns: 1fr; gap: 14px; }");
    expect(html).toContain('html[data-display-mode="fullscreen"] .path-browser { display: none; }');
  });
});
