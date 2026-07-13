import { App } from "@modelcontextprotocol/ext-apps";

const loading = document.querySelector<HTMLElement>("#loading")!;
const error = document.querySelector<HTMLElement>("#error")!;
const results = document.querySelector<HTMLElement>("#results")!;
const title = document.querySelector<HTMLElement>("#title")!;
const meta = document.querySelector<HTMLElement>("#meta")!;
const pathLabel = document.querySelector<HTMLElement>("#path-label")!;
const pathsElement = document.querySelector<HTMLElement>("#paths")!;
const synthesisElement = document.querySelector<HTMLElement>("#synthesis")!;
const toggle = document.querySelector<HTMLButtonElement>("#toggle")!;

function showError(message: string) {
  loading.hidden = true;
  results.hidden = true;
  error.hidden = false;
  error.textContent = message;
}

function renderSimulation(text: string) {
  const [beforeSynthesis, synthesis = "No synthesis was returned."] = text.split("# Mora Synthesis");
  const [header, rawPaths = ""] = beforeSynthesis.split("# Raw Path Results");
  const headerLines = header.split("\n").map((line) => line.trim()).filter(Boolean);
  const resultTitle = headerLines.find((line) => line.startsWith("# Mora Simulation:"));
  const pathBlocks = rawPaths
    .split(/(?=## Path \d+ of \d+:)/g)
    .map((block) => block.trim())
    .filter((block) => block.startsWith("## Path"));

  if (pathBlocks.length === 0) {
    showError("Mora returned a simulation, but no complete paths were available to display.");
    return;
  }

  title.textContent = resultTitle?.replace("# Mora Simulation:", "").trim() || "Simulation results";
  meta.textContent = headerLines
    .filter((line) => !line.startsWith("# Mora Simulation:"))
    .join("  ·  ");
  pathLabel.textContent = `${pathBlocks.length} raw path results — exact Mora output`;
  pathsElement.replaceChildren();

  pathBlocks.forEach((block, index) => {
    const [heading, ...bodyLines] = block.split("\n");
    const details = document.createElement("details");
    if (index === 0) details.open = true;
    const summary = document.createElement("summary");
    const headingText = document.createElement("span");
    const pathIndex = document.createElement("span");
    const body = document.createElement("pre");

    headingText.className = "path-title";
    headingText.textContent = heading.replace(/^##\s*/, "");
    pathIndex.className = "path-index";
    pathIndex.textContent = `${index + 1}/${pathBlocks.length}`;
    body.className = "path-body";
    body.textContent = bodyLines.join("\n").trim();
    summary.append(headingText, pathIndex);
    details.append(summary, body);
    pathsElement.append(details);
  });

  synthesisElement.textContent = synthesis
    .replace(/--- END OF MORA SIMULATION — STOP HERE ---\s*$/, "")
    .trim();
  loading.hidden = true;
  error.hidden = true;
  results.hidden = false;
}

toggle.addEventListener("click", () => {
  const details = [...pathsElement.querySelectorAll("details")];
  const shouldExpand = details.some((item) => !item.open);
  details.forEach((item) => { item.open = shouldExpand; });
  toggle.textContent = shouldExpand ? "Collapse all paths" : "Expand all paths";
});

const app = new App({ name: "Mora simulation results", version: "1.0.0" });
app.ontoolresult = (toolResult) => {
  const text = toolResult.content?.find((item) => item.type === "text")?.text;
  if (typeof text !== "string" || !text.trim()) {
    showError("Mora did not return displayable simulation text.");
    return;
  }
  renderSimulation(text);
};
void app.connect();
