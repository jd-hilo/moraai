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

// Claude's installed connector only mounts this exact proven v3 artifact.
// Lock the bytes until the connector can be re-registered host-side.
const EXPECTED_RAW_BYTES = 408_973;
const EXPECTED_SHA256 = "dbe919733d4e90da96db1a6675ded5ab37ee64eeb19e048b2f900dfe9ae82fe0";
// zlib output varies by runtime; Vercel's build image is ~1 KB above local.
const MAX_GZIP_BYTES = 102_000;

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
  "data:image/",
  "Recoleta-Regular.otf",
  "mora-logo.png",
]) {
  if (source.includes(forbidden)) failures.push(`bundle contains forbidden resource: ${forbidden}`);
}

for (const required of [
  '<meta name="viewport"',
  'id="loading"',
  'id="error"',
  'id="results"',
  'id="path-list"',
  'id="path-detail"',
  'aria-label="Loading simulation results"',
  "Mora simulation",
]) {
  if (!source.includes(required)) failures.push(`bundle is missing required boot contract: ${required}`);
}

if (failures.length > 0) {
  throw new Error(`MCP App verification failed:\n- ${failures.join("\n- ")}`);
}

console.log(`MCP App verified: ${rawBytes} bytes raw, ${gzipBytes} bytes gzip.`);
