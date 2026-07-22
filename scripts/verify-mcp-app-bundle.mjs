import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

const artifactPath = path.join(
  process.cwd(),
  "mcp-apps/simulation-results/dist/index.html"
);
const logoPath = path.join(
  process.cwd(),
  "mcp-apps/simulation-results/mora-logo.png"
);
const [artifact, logo] = await Promise.all([
  readFile(artifactPath),
  readFile(logoPath),
]);
const source = artifact.toString("utf8");
const rawBytes = artifact.byteLength;
const gzipBytes = gzipSync(artifact).byteLength;
const sha256 = createHash("sha256").update(artifact).digest("hex");

// Lock the production-verified v3 artifact. After intentional resource changes,
// Claude's installed connector must refresh its tools list before render tests.
const BASELINE_RAW_BYTES = 409_150;
const BASELINE_GZIP_BYTES = 99_264;
const MAX_RAW_DELTA_BYTES = 9_000;
const MAX_GZIP_DELTA_BYTES = 5_500;
const EXPECTED_RAW_BYTES = 418_076;
const EXPECTED_SHA256 = "a56d152bab357992e04b300a527bfc42ddee5cd4649ef340b1b814003a1d47bb";
const EXPECTED_LOGO_BYTES = 3_471;
const EXPECTED_LOGO_SHA256 = "e6416bdf6e3a87506066b68878e787b7e95b807cbf21dd66880c9cd02e889024";
const expectedLogoDataUri = `data:image/png;base64,${logo.toString("base64")}`;
const imageDataUris = source.match(/data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+/g) ?? [];

const failures = [];
if (rawBytes !== EXPECTED_RAW_BYTES) {
  failures.push(`raw bundle is ${rawBytes} bytes; expected ${EXPECTED_RAW_BYTES}`);
}
if (sha256 !== EXPECTED_SHA256) {
  failures.push(`bundle SHA-256 is ${sha256}; expected ${EXPECTED_SHA256}`);
}
if (rawBytes - BASELINE_RAW_BYTES > MAX_RAW_DELTA_BYTES) {
  failures.push(`raw bundle delta is ${rawBytes - BASELINE_RAW_BYTES} bytes; budget is ${MAX_RAW_DELTA_BYTES}`);
}
if (gzipBytes - BASELINE_GZIP_BYTES > MAX_GZIP_DELTA_BYTES) {
  failures.push(`gzip bundle delta is ${gzipBytes - BASELINE_GZIP_BYTES} bytes; budget is ${MAX_GZIP_DELTA_BYTES}`);
}
if (logo.byteLength !== EXPECTED_LOGO_BYTES) {
  failures.push(`logo is ${logo.byteLength} bytes; expected ${EXPECTED_LOGO_BYTES}`);
}
if (createHash("sha256").update(logo).digest("hex") !== EXPECTED_LOGO_SHA256) {
  failures.push("logo SHA-256 does not match the reviewed canonical resize");
}
if (logo.readUInt32BE(16) !== 113 || logo.readUInt32BE(20) !== 34) {
  failures.push("logo must remain the reviewed 113 x 34 two-density asset");
}
if (imageDataUris.length !== 2 || imageDataUris.some((uri) => uri !== expectedLogoDataUri)) {
  failures.push("bundle must contain only the reviewed logo in both brand lines");
}

for (const forbidden of [
  "data:font/",
  "Recoleta-Regular.otf",
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
  'alt="Mora"',
  ">simulation<",
]) {
  if (!source.includes(required)) failures.push(`bundle is missing required boot contract: ${required}`);
}

if (failures.length > 0) {
  throw new Error(`MCP App verification failed:\n- ${failures.join("\n- ")}`);
}

console.log(`MCP App verified: ${rawBytes} bytes raw, ${gzipBytes} bytes gzip.`);
