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

// Lock the production-verified v3 artifact. After intentional resource changes,
// Claude's installed connector must refresh its tools list before render tests.
const EXPECTED_RAW_BYTES = 409_150;
const EXPECTED_SHA256 = "77bac8148ed1b46f4292c039e5cf2c8b3fda75731f1a2c82e65ed0927b30401f";
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
  "fonts.googleapis.com",
  "fonts.gstatic.com",
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
