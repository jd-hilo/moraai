import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

describe("Mora web-app presentation", () => {
  it("restores the original Mora chat typography and color tokens", async () => {
    const css = await readFile(path.join(root, "app/globals.css"), "utf8");

    expect(css).toContain("--color-bg: #ffffff");
    expect(css).toContain("--color-user-bubble: #f4f4f4");
    expect(css).toContain("--color-sidebar-bg: #f9f9f9");
    expect(css).toContain("fonts.googleapis.com/css2?family=DM+Sans");
    expect(css).not.toContain("--gradient-peach");
  });

  it("restores the original authenticated shell dimensions and mobile toggle", async () => {
    const [layout, css] = await Promise.all([
      readFile(path.join(root, "app/(app)/layout.tsx"), "utf8"),
      readFile(path.join(root, "app/globals.css"), "utf8"),
    ]);

    expect(layout).toContain('minHeight: "100vh"');
    expect(layout).toContain('className="md-hidden-toggle"');
    expect(layout).toContain("main { margin-left: 260px; }");
    expect(layout).not.toContain('className="mora-main"');
    expect(css).not.toContain("margin-left: 272px");
  });

  it("gives the simulation dashboard a wide canvas with a mobile fallback", async () => {
    const css = await readFile(
      path.join(root, "components/skills/simulations/simulations.module.css"),
      "utf8"
    );

    expect(css).toContain("width: min(100%, 1180px)");
    expect(css).toContain("max-width: 100%");
    expect(css).toContain("font-family: var(--font-display)");
    expect(css).toContain("background: var(--gradient-peach)");
    expect(css).toContain("@media (max-width: 767px)");
    expect(css).toContain("padding: 76px 18px 64px");
  });
});
