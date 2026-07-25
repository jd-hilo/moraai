import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const artifactPath = path.join(
  process.cwd(),
  "mcp-apps/simulation-results/dist/index.html"
);
const artifact = await readFile(artifactPath);
const source = artifact.toString("utf8");
const rawBytes = artifact.byteLength;
const gzipBytes = gzipSync(artifact).byteLength;
const sha256 = createHash("sha256").update(artifact).digest("hex");

// Lock the reviewed v3 artifact. After intentional resource changes, Claude's
// installed connector must refresh its tools list before render tests.
const EXPECTED_RAW_BYTES = 436_060;
const EXPECTED_SHA256 = "bb70ba916ea93eebe2fe53f7dcae36b89919cec803ca7c930492d8cffd70c40e";
// zlib output varies by runtime; Vercel's build image is ~1 KB above local.
const MAX_GZIP_BYTES = 116_000;

const failures = [];
if (rawBytes !== EXPECTED_RAW_BYTES) {
  failures.push(`raw bundle is ${rawBytes} bytes; expected ${EXPECTED_RAW_BYTES}`);
}
if (sha256 !== EXPECTED_SHA256) {
  failures.push(`bundle SHA-256 is ${sha256}; expected ${EXPECTED_SHA256}`);
}
if (gzipBytes > MAX_GZIP_BYTES) {
  failures.push(`gzip bundle is ${gzipBytes} bytes; budget is ${MAX_GZIP_BYTES}`);
}

for (const forbidden of [
  "data:font/",
  "Recoleta-Regular.otf",
  "mora-logo.png",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
]) {
  if (source.includes(forbidden)) failures.push(`bundle contains forbidden resource: ${forbidden}`);
}

const imageDataUrls = source.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/g) ?? [];
const uniqueImageDataUrls = new Set(imageDataUrls);
if (uniqueImageDataUrls.size !== 1) {
  failures.push(`bundle contains ${uniqueImageDataUrls.size} unique PNG assets; expected 1`);
} else {
  const [logoDataUrl] = uniqueImageDataUrls;
  const logoBytes = Buffer.from(logoDataUrl.split(",")[1], "base64").byteLength;
  if (logoBytes > 12_000) {
    failures.push(`embedded Mora logo is ${logoBytes} bytes; budget is 12000`);
  }
}

for (const required of [
  '<meta name="viewport"',
  'id="loading"',
  'id="error"',
  'id="results"',
  'id="path-list"',
  'id="path-detail"',
  'aria-label="Loading simulation results"',
  'alt="Mora"',
  "Possible paths",
]) {
  if (!source.includes(required)) failures.push(`bundle is missing required boot contract: ${required}`);
}

if (failures.length > 0) {
  throw new Error(`MCP App verification failed:\n- ${failures.join("\n- ")}`);
}

console.log(`MCP App verified: ${rawBytes} bytes raw, ${gzipBytes} bytes gzip.`);
