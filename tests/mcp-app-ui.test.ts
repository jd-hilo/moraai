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

    expect(artifact.byteLength).toBe(418_076);
    expect(artifact.byteLength - 409_150).toBeLessThanOrEqual(9_000);
    expect(gzipSync(artifact).byteLength - 99_264).toBeLessThanOrEqual(5_500);
    expect(createHash("sha256").update(artifact).digest("hex")).toBe(
      "a56d152bab357992e04b300a527bfc42ddee5cd4649ef340b1b814003a1d47bb"
    );
    expect(source).not.toContain("data:font/");
    expect(source).not.toContain("Recoleta-Regular.otf");
    expect(source).not.toContain("fonts.googleapis.com");
    expect(source).not.toContain("fonts.gstatic.com");
  });

  it("bundles only the reviewed two-density canonical Mora logo", async () => {
    const [artifact, logo] = await Promise.all([
      readFile(path.join(root, "mcp-apps/simulation-results/dist/index.html"), "utf8"),
      readFile(path.join(root, "mcp-apps/simulation-results/mora-logo.png")),
    ]);
    const expectedDataUri = `data:image/png;base64,${logo.toString("base64")}`;
    const imageDataUris = artifact.match(
      /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g
    ) ?? [];

    expect(logo.byteLength).toBe(3_471);
    expect(logo.readUInt32BE(16)).toBe(113);
    expect(logo.readUInt32BE(20)).toBe(34);
    expect(createHash("sha256").update(logo).digest("hex")).toBe(
      "e6416bdf6e3a87506066b68878e787b7e95b807cbf21dd66880c9cd02e889024"
    );
    expect(imageDataUris).toEqual([expectedDataUri, expectedDataUri]);
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
    expect(html.match(/<img class="brand-logo"[^>]+alt="Mora"[^>]*>/g)).toHaveLength(2);
    expect(html.match(/<span>simulation<\/span>/g)).toHaveLength(2);
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
      "feea807f42fe52ea856bc18246168640f7b92765ac654a1ea6b0098e0933b9c4"
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
    expect(html).toContain(".brand-logo {");
    expect(html).toContain("height: 17px;");
  });
});
