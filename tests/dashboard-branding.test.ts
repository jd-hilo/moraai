import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Unreal design-system mapping", () => {
  it("defines the shared Mora dashboard typography and color tokens", async () => {
    const css = await readFile(path.join(root, "app/globals.css"), "utf8");

    expect(css).toContain("--color-bg: #fafafa");
    expect(css).toContain("--color-surface: #ffffff");
    expect(css).toContain("--color-text-secondary: rgba(22, 21, 20, 0.7)");
    expect(css).toContain("--font-display: \"Recoleta\", Georgia, serif");
    expect(css).toContain("--gradient-peach: linear-gradient(135deg, #e87a7f 0%, #e4b5d3 52%, #e4b8a6 100%)");
    expect(css).not.toContain("fonts.googleapis.com/css2?family=DM+Sans");
  });

  it("keeps the authenticated shell viewport-safe and responsive", async () => {
    const [layout, css] = await Promise.all([
      readFile(path.join(root, "app/(app)/layout.tsx"), "utf8"),
      readFile(path.join(root, "app/globals.css"), "utf8"),
    ]);

    expect(layout).toContain('minHeight: "100dvh"');
    expect(layout).toContain('className="mora-main"');
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toContain("margin-left: 272px");
    expect(css).toContain("width: calc(100% - 272px)");
  });

  it("gives the simulation dashboard a wide canvas with a mobile fallback", async () => {
    const css = await readFile(
      path.join(root, "components/skills/simulations/simulations.module.css"),
      "utf8"
    );

    expect(css).toContain("width: min(100%, 1180px)");
    expect(css).toContain("font-family: var(--font-display)");
    expect(css).toContain("background: var(--gradient-peach)");
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).toContain("padding: 76px 18px 64px");
  });
});
