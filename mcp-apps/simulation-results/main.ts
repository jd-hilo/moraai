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
const displayModeToggle = document.querySelector<HTMLButtonElement>("#display-mode-toggle")!;
const modeStatus = document.querySelector<HTMLElement>("#mode-status")!;

type ReadingDestination = "fullscreen" | "inline" | "external";

let simulationUrl = "";
let hasSynthesis = false;
let readingExpanded = false;

function announce(message: string) {
  modeStatus.textContent = "";
  requestAnimationFrame(() => {
    modeStatus.textContent = message;
  });
}

function setReadingVisibility(visible: boolean) {
  readingExpanded = visible;
  const narrative = pathDetail.querySelector<HTMLElement>(".narrative");
  if (narrative) narrative.dataset.expanded = String(visible);

  synthesisPanel.hidden = !visible || !hasSynthesis;
  synthesisToggle.setAttribute("aria-expanded", String(visible));
  const isFullscreen = document.documentElement.dataset.displayMode === "fullscreen";
  synthesisToggle.hidden = isFullscreen && !hasSynthesis;
  synthesisToggle.textContent = isFullscreen
    ? visible ? "Hide Mora synthesis" : "View Mora synthesis"
    : visible ? "Show less" : "Read full path";
}

function syncDisplayMode(mode = app.getHostContext()?.displayMode ?? "inline") {
  const readingMode = mode === "fullscreen" ? "fullscreen" : "inline";
  document.documentElement.dataset.displayMode = readingMode;
  displayModeToggle.hidden = readingMode !== "fullscreen";

  if (readingMode === "inline") {
    setReadingVisibility(false);
  } else {
    setReadingVisibility(readingExpanded);
  }
}

async function openSimulationInMora(): Promise<boolean> {
  if (!simulationUrl) return false;

  try {
    const result = await app.openLink({ url: simulationUrl });
    if (result.isError) return false;
    announce("Opened the full simulation in Mora.");
    return true;
  } catch {
    return false;
  }
}

async function enterReadingMode(trigger: HTMLButtonElement): Promise<ReadingDestination> {
  const context = app.getHostContext();
  if (context?.displayMode === "fullscreen") return "fullscreen";

  const label = trigger.textContent;
  trigger.disabled = true;
  trigger.setAttribute("aria-busy", "true");

  try {
    if (context?.availableDisplayModes?.includes("fullscreen")) {
      const result = await app.requestDisplayMode({ mode: "fullscreen" });
      syncDisplayMode(result.mode);
      if (result.mode === "fullscreen") return "fullscreen";
    }

    if (await openSimulationInMora()) return "external";

    announce("Expanded inline because this host does not offer a reading view.");
    return "inline";
  } catch {
    if (await openSimulationInMora()) return "external";
    announce("Expanded inline because the reading view could not be opened.");
    return "inline";
  } finally {
    trigger.disabled = false;
    trigger.removeAttribute("aria-busy");
    trigger.textContent = label;
  }
}

function showError(message: string) {
  loading.hidden = true;
  results.hidden = true;
  error.hidden = false;
  error.replaceChildren();

  const mark = document.createElement("span");
  mark.className = "error-mark";
  mark.setAttribute("aria-hidden", "true");
  mark.innerHTML = `<svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M8.5 5v4M8.5 12.2v.1M8.5 15.2a6.7 6.7 0 1 0 0-13.4 6.7 6.7 0 0 0 0 13.4Z" stroke="currentColor" stroke-width="1.35" stroke-linecap="round" /></svg>`;

  const copy = document.createElement("div");
  copy.className = "error-copy";
  const heading = document.createElement("h2");
  heading.textContent = "These simulation results could not be displayed";
  const detail = document.createElement("p");
  detail.textContent = `${message} Ask Claude to run the simulation again if the problem continues.`;
  copy.append(heading, detail);
  error.append(mark, copy);
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
  pathDetail.setAttribute("aria-labelledby", `path-tab-${index}`);

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
  narrative.id = "path-narrative";
  narrative.dataset.expanded = String(readingExpanded);
  narrative.textContent = path.output;

  const actions = document.createElement("div");
  actions.className = "detail-actions";
  actions.append(synthesisToggle);

  const footer = document.createElement("div");
  footer.className = "detail-footer";
  footer.innerHTML = `<span>Run status: <strong></strong></span><span>Path confidence: <strong></strong></span><span class="context-note"></span>`;
  const values = footer.querySelectorAll("strong");
  values[0].textContent = path.runStatus;
  values[1].textContent = confidence;
  footer.querySelector<HTMLElement>(".context-note")!.textContent = shareWithModel
    ? "Selected for your next Claude message"
    : "Select this path to discuss it with Claude";
  pathDetail.append(heading, premise, narrative, actions, footer);

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
  hasSynthesis = result.report !== null;
  setReadingVisibility(false);
  if (!result.report) {
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
  simulationUrl = result.simulationUrl;
  pathList.replaceChildren();

  result.paths.forEach((path, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "path-row";
    button.id = `path-tab-${index}`;
    button.setAttribute("role", "tab");
    button.setAttribute("aria-controls", "path-detail");
    button.setAttribute("aria-label", `Path ${index + 1}: ${path.title}, ${path.probability}% likely`);
    button.setAttribute("aria-selected", index === 0 ? "true" : "false");
    button.tabIndex = index === 0 ? 0 : -1;
    button.innerHTML = `<span class="path-number"></span><span class="path-copy"><strong></strong><small></small></span><span class="path-probability"></span>`;
    button.querySelector<HTMLElement>(".path-number")!.textContent = String(index + 1).padStart(2, "0");
    button.querySelector("strong")!.textContent = path.title;
    button.querySelector("small")!.textContent = path.description;
    button.querySelector<HTMLElement>(".path-probability")!.textContent = `${path.probability}%`;
    const selectPath = () => {
      pathList.querySelectorAll<HTMLButtonElement>(".path-row").forEach((row) => {
        row.setAttribute("aria-selected", "false");
        row.tabIndex = -1;
      });
      button.setAttribute("aria-selected", "true");
      button.tabIndex = 0;
      renderPath(path, index, result.paths.length, true);
    };
    button.addEventListener("click", selectPath);
    button.addEventListener("keydown", (event) => {
      const buttons = Array.from(pathList.querySelectorAll<HTMLButtonElement>(".path-row"));
      const current = buttons.indexOf(button);
      let next = current;
      if (event.key === "ArrowRight") next = (current + 1) % buttons.length;
      else if (event.key === "ArrowLeft") next = (current - 1 + buttons.length) % buttons.length;
      else if (event.key === "ArrowDown") next = (current + 5) % buttons.length;
      else if (event.key === "ArrowUp") next = (current - 5 + buttons.length) % buttons.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = buttons.length - 1;
      else return;
      event.preventDefault();
      buttons[next].focus();
      buttons[next].click();
    });
    pathList.append(button);
  });

  renderPath(result.paths[0], 0, result.paths.length);
  renderReport(result);
  loading.hidden = true;
  error.hidden = true;
  results.hidden = false;
}

synthesisToggle.addEventListener("click", async () => {
  const shouldShow = !readingExpanded;
  if (!shouldShow) {
    setReadingVisibility(false);
    return;
  }

  const destination = await enterReadingMode(synthesisToggle);
  if (destination !== "external") setReadingVisibility(true);
});

displayModeToggle.addEventListener("click", async () => {
  displayModeToggle.disabled = true;
  displayModeToggle.setAttribute("aria-busy", "true");
  try {
    const result = await app.requestDisplayMode({ mode: "inline" });
    syncDisplayMode(result.mode);
  } catch {
    announce("The chat view could not be restored. You can also press Escape.");
  } finally {
    displayModeToggle.disabled = false;
    displayModeToggle.removeAttribute("aria-busy");
  }
});

const app = new App({ name: "Mora simulation results", version: "1.0.0" });
app.onhostcontextchanged = () => {
  syncDisplayMode();
};
app.ontoolresult = (toolResult) => {
  const simulationResult = toolResult._meta?.["mora/simulationResult"];
  if (!isSimulationResult(simulationResult)) {
    showError("Mora did not return structured simulation paths.");
    return;
  }
  renderSimulation(simulationResult);
};
void app.connect()
  .then(() => syncDisplayMode())
  .catch(() => showError("Mora could not connect to this MCP host."));
