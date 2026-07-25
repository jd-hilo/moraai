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
  simulationUrl: string;
}

const loading = document.querySelector<HTMLElement>("#loading")!;
const error = document.querySelector<HTMLElement>("#error")!;
const results = document.querySelector<HTMLElement>("#results")!;
const title = document.querySelector<HTMLElement>("#title")!;
const meta = document.querySelector<HTMLElement>("#meta")!;
const pathList = document.querySelector<HTMLElement>("#path-list")!;
const pathDetail = document.querySelector<HTMLElement>("#path-detail")!;
const pathPosition = document.querySelector<HTMLElement>("#path-position")!;
const previousPathButton = document.querySelector<HTMLButtonElement>("#previous-path")!;
const nextPathButton = document.querySelector<HTMLButtonElement>("#next-path")!;
const readPathButton = document.querySelector<HTMLButtonElement>("#read-path")!;
const openInMoraButton = document.querySelector<HTMLButtonElement>("#open-in-mora")!;
const displayModeToggle = document.querySelector<HTMLButtonElement>("#display-mode-toggle")!;
const modeStatus = document.querySelector<HTMLElement>("#mode-status")!;

type ReadingDestination = "fullscreen" | "external" | "unavailable";

let simulationUrl = "";
let readingExpanded = false;
let currentPaths: SimulationPath[] = [];
let selectedPathIndex = 0;

function announce(message: string) {
  modeStatus.textContent = "";
  requestAnimationFrame(() => {
    modeStatus.textContent = message;
  });
}

function renderPath(path: SimulationPath, index: number, total: number) {
  pathDetail.replaceChildren();
  pathDetail.setAttribute("aria-labelledby", `path-tab-${index}`);

  const heading = document.createElement("div");
  heading.className = "detail-heading";
  heading.innerHTML = `<div><p class="detail-kicker">Path ${index + 1}</p><h2></h2></div><span class="probability"></span>`;
  heading.querySelector("h2")!.textContent = path.title;
  heading.querySelector<HTMLElement>(".probability")!.textContent = `${path.probability}% likely`;
  pathDetail.append(heading);

  if (readingExpanded) {
    const narrative = document.createElement("p");
    narrative.className = "narrative";
    narrative.id = "path-narrative";
    narrative.textContent = path.output;
    pathDetail.append(narrative);
  }

  const actions = document.createElement("div");
  actions.className = "detail-actions";
  actions.append(readPathButton, openInMoraButton);
  pathDetail.append(actions);

  pathPosition.textContent = `${index + 1} / ${total}`;
  previousPathButton.disabled = index === 0;
  nextPathButton.disabled = index === total - 1;
}

function setReadingVisibility(visible: boolean) {
  readingExpanded = visible;
  const path = currentPaths[selectedPathIndex];
  if (path) renderPath(path, selectedPathIndex, currentPaths.length);
}

function syncDisplayMode(mode = app.getHostContext()?.displayMode ?? "inline") {
  const hostSafeBottom = app.getHostContext()?.safeAreaInsets?.bottom ?? 0;
  document.documentElement.style.setProperty("--host-safe-bottom", `${hostSafeBottom}px`);
  const readingMode = mode === "fullscreen" ? "fullscreen" : "inline";
  document.documentElement.dataset.displayMode = readingMode;
  displayModeToggle.hidden = readingMode !== "fullscreen";
  setReadingVisibility(readingMode === "fullscreen");
}

async function openSimulationInMora(): Promise<boolean> {
  if (!simulationUrl) return false;

  try {
    const result = await app.openLink({ url: simulationUrl });
    if (result.isError) return false;
    announce("Opened this simulation in Mora.");
    return true;
  } catch {
    return false;
  }
}

async function enterReadingMode(trigger: HTMLButtonElement): Promise<ReadingDestination> {
  const context = app.getHostContext();
  if (context?.displayMode === "fullscreen") return "fullscreen";

  trigger.disabled = true;
  trigger.setAttribute("aria-busy", "true");

  try {
    if (context?.availableDisplayModes?.includes("fullscreen")) {
      const result = await app.requestDisplayMode({ mode: "fullscreen" });
      syncDisplayMode(result.mode);
      if (result.mode === "fullscreen") return "fullscreen";
    }

    if (await openSimulationInMora()) return "external";
    announce("This host could not open a reading view. Use Open in Mora to continue.");
    return "unavailable";
  } catch {
    if (await openSimulationInMora()) return "external";
    announce("The reading view could not be opened. Use Open in Mora to continue.");
    return "unavailable";
  } finally {
    trigger.disabled = false;
    trigger.removeAttribute("aria-busy");
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

function sharePathWithModel(path: SimulationPath, index: number, total: number) {
  announce(`Path ${index + 1} selected for your next Claude message.`);

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
    announce(`Path ${index + 1} selected in Mora.`);
  });
}

function selectPath(index: number, shareWithModel = true, focusTab = false) {
  if (index < 0 || index >= currentPaths.length) return;
  selectedPathIndex = index;

  const buttons = Array.from(pathList.querySelectorAll<HTMLButtonElement>(".path-row"));
  buttons.forEach((button, buttonIndex) => {
    const selected = buttonIndex === index;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });

  const selectedButton = buttons[index];
  if (selectedButton) {
    const targetLeft = selectedButton.offsetLeft - Math.max(0, (pathList.clientWidth - selectedButton.offsetWidth) / 2);
    pathList.scrollTo({ left: targetLeft, behavior: "smooth" });
    if (focusTab) selectedButton.focus();
  }

  const path = currentPaths[index]!;
  renderPath(path, index, currentPaths.length);
  if (shareWithModel) sharePathWithModel(path, index, currentPaths.length);
}

function renderSimulation(result: SimulationResult) {
  if (result.paths.length === 0) {
    showError("Mora returned a simulation, but no complete paths were available to display.");
    return;
  }

  title.textContent = result.simulation.title;
  meta.textContent = `${result.simulation.timeHorizonYears}-year outlook · ${result.pathCount} paths`;
  simulationUrl = result.simulationUrl;
  currentPaths = result.paths;
  selectedPathIndex = 0;
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
    button.innerHTML = `<span class="path-number"></span><span class="path-probability"></span><span class="path-name"></span>`;
    button.querySelector<HTMLElement>(".path-number")!.textContent = String(index + 1).padStart(2, "0");
    button.querySelector<HTMLElement>(".path-probability")!.textContent = `${path.probability}%`;
    button.querySelector<HTMLElement>(".path-name")!.textContent = path.title;

    button.addEventListener("click", () => selectPath(index));
    button.addEventListener("keydown", (event) => {
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % currentPaths.length;
      else if (event.key === "ArrowLeft") next = (index - 1 + currentPaths.length) % currentPaths.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = currentPaths.length - 1;
      else return;
      event.preventDefault();
      selectPath(next, true, true);
    });
    pathList.append(button);
  });

  renderPath(result.paths[0]!, 0, result.paths.length);
  loading.hidden = true;
  error.hidden = true;
  results.hidden = false;
}

previousPathButton.addEventListener("click", () => {
  selectPath(selectedPathIndex - 1, true, true);
});

nextPathButton.addEventListener("click", () => {
  selectPath(selectedPathIndex + 1, true, true);
});

readPathButton.addEventListener("click", async () => {
  await enterReadingMode(readPathButton);
});

openInMoraButton.addEventListener("click", async () => {
  openInMoraButton.disabled = true;
  openInMoraButton.setAttribute("aria-busy", "true");
  try {
    if (!await openSimulationInMora()) {
      announce("Mora could not be opened from this host.");
    }
  } finally {
    openInMoraButton.disabled = false;
    openInMoraButton.removeAttribute("aria-busy");
  }
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
