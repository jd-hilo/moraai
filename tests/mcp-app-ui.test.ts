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

    expect(artifact.byteLength).toBe(434_765);
    expect(gzipSync(artifact).byteLength).toBeLessThanOrEqual(116_000);
    expect(createHash("sha256").update(artifact).digest("hex")).toBe(
      "d4c880403a0ff4654f5233ebf79e01e458047e45b7a68b42885e456b6d08a1b9"
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
      "1f5d1325059801e30781f2773a72cc888b69134642779372f7864ad573c09c03"
    );
  });

  it("keeps a calm two-row path flow and collapses safely for smaller hosts", async () => {
    const html = await readFile(
      path.join(root, "mcp-apps/simulation-results/index.html"),
      "utf8"
    );

    expect(html).toContain("max-width: 980px");
    expect(html).not.toContain("explorer-grid");
    expect(html).toContain("grid-template-columns: repeat(5, minmax(0, 1fr))");
    expect(html).not.toContain("grid-template-columns: minmax(190px, .82fr) minmax(0, 1.38fr)");
    expect(html).toContain("@media (max-width: 560px)");
    expect(html).toContain(".header-main { grid-template-columns: 1fr; gap: 14px; }");
    expect(html).toContain('.narrative[data-expanded="true"] { display: block; }');
  });
});
