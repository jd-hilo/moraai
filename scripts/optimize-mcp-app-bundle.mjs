import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const artifactPath = path.join(
  process.cwd(),
  "mcp-apps/simulation-results/dist/index.html"
);
const input = await readFile(artifactPath, "utf8");

// The host receives this entire document as one MCP resource. Vite already
// minifies the JavaScript; compact the authored CSS and inter-tag whitespace
// without touching text content or the generated module script.
const output = input
  .replace(/<style>([\s\S]*?)<\/style>/u, (_match, css) => {
    const compactCss = css
      .replace(/\/\*[\s\S]*?\*\//gu, "")
      .replace(/\s+/gu, " ")
      .replace(/\s*([{}:;,])\s*/gu, "$1")
      .replace(/;(?=\})/gu, "");
    return `<style>${compactCss}</style>`;
  })
  .replace(/>\s+</gu, "><")
  .trim();

await writeFile(artifactPath, output, "utf8");
console.log(
  `MCP App optimized: ${Buffer.byteLength(input)} → ${Buffer.byteLength(output)} bytes raw.`
);
