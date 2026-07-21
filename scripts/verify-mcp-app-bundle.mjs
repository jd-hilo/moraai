import { gzipSync } from "node:zlib";
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

// Known-good pre-#28 was 408,973 bytes. Keep the resource below both that
// artifact and the apparent 400 KiB (409,600-byte) Claude host boundary.
const MAX_RAW_BYTES = 408_500;
const MAX_GZIP_BYTES = 100_000;

const failures = [];
if (rawBytes > MAX_RAW_BYTES) {
  failures.push(`raw bundle is ${rawBytes} bytes; budget is ${MAX_RAW_BYTES}`);
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
  "Loading your possible futures",
]) {
  if (!source.includes(required)) failures.push(`bundle is missing required boot contract: ${required}`);
}

if (failures.length > 0) {
  throw new Error(`MCP App verification failed:\n- ${failures.join("\n- ")}`);
}

console.log(`MCP App verified: ${rawBytes} bytes raw, ${gzipBytes} bytes gzip.`);
