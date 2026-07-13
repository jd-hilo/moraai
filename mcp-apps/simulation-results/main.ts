import { App } from "@modelcontextprotocol/ext-apps";

interface SimulationPath {
  id: string;
  title: string;
  description: string;
  probability: number;
  runStatus: string;
  output: string;
  confidence: number | null;
}

interface ReportSection {
  title: string;
  points: string[];
}

interface SimulationResult {
  status: "ok";
  presentation: "mcp_app";
  pathCount: number;
  completedPathCount: number;
  simulation: {
    id: string;
    title: string;
    scenario: string;
    timeHorizonYears: number;
    status: "complete";
  };
  paths: SimulationPath[];
  report: {
    verdict: string;
    overallConfidence: number;
    topPossibilityId: string;
    summary: string;
    outcomes: ReportSection;
    risks: ReportSection;
    insights: ReportSection;
  } | null;
  simulationUrl: string;
}

const loading = document.querySelector<HTMLElement>("#loading")!;
const error = document.querySelector<HTMLElement>("#error")!;
const results = document.querySelector<HTMLElement>("#results")!;
const title = document.querySelector<HTMLElement>("#title")!;
const meta = document.querySelector<HTMLElement>("#meta")!;
const count = document.querySelector<HTMLElement>("#count")!;
const pathList = document.querySelector<HTMLElement>("#path-list")!;
const pathDetail = document.querySelector<HTMLElement>("#path-detail")!;
const synthesisElement = document.querySelector<HTMLElement>("#synthesis")!;
const synthesisToggle = document.querySelector<HTMLButtonElement>("#synthesis-toggle")!;
const synthesisPanel = document.querySelector<HTMLElement>("#synthesis-panel")!;

function showError(message: string) {
  loading.hidden = true;
  results.hidden = true;
  error.hidden = false;
  error.textContent = message;
}

function isSimulationResult(value: unknown): value is SimulationResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<SimulationResult>;
  return candidate.status === "ok" &&
    candidate.presentation === "mcp_app" &&
    Array.isArray(candidate.paths) &&
    candidate.paths.length > 0 &&
    typeof candidate.simulation?.title === "string";
}

function renderPath(path: SimulationPath, index: number, total: number, shareWithModel = false) {
  const confidence = path.confidence === null ? "Not reported" : `${path.confidence}%`;
  pathDetail.replaceChildren();

  const heading = document.createElement("div");
  heading.className = "detail-heading";
  heading.innerHTML = `<div><p class="detail-kicker">Path ${index + 1} of ${total}</p><h2></h2></div><span class="probability"></span>`;
  heading.querySelector("h2")!.textContent = path.title;
  heading.querySelector<HTMLElement>(".probability")!.textContent = `${path.probability}% likely`;

  const premise = document.createElement("p");
  premise.className = "premise";
  premise.textContent = path.description;

  const narrative = document.createElement("p");
  narrative.className = "narrative";
  narrative.textContent = path.output;

  const footer = document.createElement("div");
  footer.className = "detail-footer";
  footer.innerHTML = `<span>Run status: <strong></strong></span><span>Path confidence: <strong></strong></span><span class="context-note"></span>`;
  const values = footer.querySelectorAll("strong");
  values[0].textContent = path.runStatus;
  values[1].textContent = confidence;
  footer.querySelector<HTMLElement>(".context-note")!.textContent = shareWithModel
    ? "Selected for your next Claude message"
    : "Select this path to discuss it with Claude";
  pathDetail.append(heading, premise, narrative, footer);

  if (!shareWithModel) return;

  void app.updateModelContext({
    content: [
      {
        type: "text",
        text: [
          `The user selected Mora simulation path ${index + 1} of ${total}: ${path.title}.`,
          `Probability: ${path.probability}%.`,
          `Premise: ${path.description}`,
          `Raw Mora path output: ${path.output}`,
          path.confidence === null ? "" : `Path confidence: ${path.confidence}%.`,
          "Use this path only if the user asks a follow-up question. Do not proactively analyze it.",
        ].filter(Boolean).join("\n\n"),
      },
    ],
    structuredContent: { selectedPath: path, pathIndex: index + 1, pathCount: total },
  }).catch(() => {
    footer.querySelector<HTMLElement>(".context-note")!.textContent =
      "Path selected in Mora";
  });
}

function renderReport(result: SimulationResult) {
  synthesisElement.replaceChildren();
  if (!result.report) {
    synthesisElement.textContent = "No synthesis was returned.";
    return;
  }

  const intro = document.createElement("div");
  intro.className = "synthesis-intro";
  intro.innerHTML = `<p class="verdict"></p><p class="summary"></p>`;
  intro.querySelector<HTMLElement>(".verdict")!.textContent = result.report.verdict;
  intro.querySelector<HTMLElement>(".summary")!.textContent = result.report.summary;
  synthesisElement.append(intro);

  [result.report.outcomes, result.report.risks, result.report.insights].forEach((section) => {
    const block = document.createElement("section");
    const heading = document.createElement("h3");
    const list = document.createElement("ul");
    heading.textContent = section.title;
    section.points.forEach((point) => {
      const item = document.createElement("li");
      item.textContent = point;
      list.append(item);
    });
    block.append(heading, list);
    synthesisElement.append(block);
  });
}

function renderSimulation(result: SimulationResult) {
  if (result.paths.length === 0) {
    showError("Mora returned a simulation, but no complete paths were available to display.");
    return;
  }

  title.textContent = result.simulation.title;
  meta.textContent = `${result.simulation.scenario} · ${result.simulation.timeHorizonYears}-year horizon`;
  count.textContent = `${result.completedPathCount}/${result.pathCount} complete`;
  pathList.replaceChildren();

  result.paths.forEach((path, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "path-row";
    button.setAttribute("aria-pressed", index === 0 ? "true" : "false");
    button.innerHTML = `<span class="path-number"></span><span class="path-copy"><strong></strong><small></small></span><span class="path-probability"></span>`;
    button.querySelector<HTMLElement>(".path-number")!.textContent = String(index + 1).padStart(2, "0");
    button.querySelector("strong")!.textContent = path.title;
    button.querySelector("small")!.textContent = path.description;
    button.querySelector<HTMLElement>(".path-probability")!.textContent = `${path.probability}%`;
    button.addEventListener("click", () => {
      pathList.querySelectorAll(".path-row").forEach((row) => row.setAttribute("aria-pressed", "false"));
      button.setAttribute("aria-pressed", "true");
      renderPath(path, index, result.paths.length, true);
    });
    pathList.append(button);
  });

  renderPath(result.paths[0], 0, result.paths.length);
  renderReport(result);
  loading.hidden = true;
  error.hidden = true;
  results.hidden = false;
}

synthesisToggle.addEventListener("click", () => {
  const shouldShow = synthesisPanel.hidden;
  synthesisPanel.hidden = !shouldShow;
  synthesisToggle.setAttribute("aria-expanded", String(shouldShow));
  synthesisToggle.textContent = shouldShow ? "Hide Mora synthesis" : "View Mora synthesis";
});

const app = new App({ name: "Mora simulation results", version: "1.0.0" });
app.ontoolresult = (toolResult) => {
  const simulationResult = toolResult._meta?.["mora/simulationResult"];
  if (!isSimulationResult(simulationResult)) {
    showError("Mora did not return structured simulation paths.");
    return;
  }
  renderSimulation(simulationResult);
};
void app.connect();
