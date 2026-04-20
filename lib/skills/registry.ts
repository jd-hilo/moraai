/**
 * Skill registry. Every Mora "skill" is a different agentic experience — a
 * distinct UI + backend pipeline the user can pull their twin into. Today we
 * have one skill (simulations). Decisions is next. The marketplace will render
 * from this registry.
 */

export interface Skill {
  id: string;
  name: string;
  tagline: string;
  description: string;
  route: string;
  /** Heroicon-ish inline SVG path data to avoid new deps. */
  iconPath: string;
}

export const skills: Skill[] = [
  {
    id: "simulations",
    name: "Simulations",
    tagline: "Play out what-ifs across your actual life",
    description:
      "Describe a scenario. Mora spins up 10 lenses — people in your life, facets of you, stakeholders — and runs them in parallel. You get a dashboard and an in-depth report on how it ripples through everything.",
    route: "/skills/simulations",
    // compass / star
    iconPath:
      "M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41M12 8l1.5 3L17 12l-3.5 1L12 16l-1.5-3L7 12l3.5-1z",
  },
];

export function getSkill(id: string): Skill | undefined {
  return skills.find((s) => s.id === id);
}
