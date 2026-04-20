import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SimulationsList } from "@/components/skills/simulations/simulations-list";

export const dynamic = "force-dynamic";

export default function SimulationsPage() {
  return (
    <div
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: "48px 24px 80px",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: 16,
          marginBottom: 32,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 600,
              color: "#0d0d0d",
              margin: 0,
              marginBottom: 6,
            }}
          >
            Simulations
          </h1>
          <div style={{ fontSize: 14, color: "#6e6e80", lineHeight: 1.5 }}>
            Play out a scenario through 10 lenses drawn from your life — and get
            an in-depth report.
          </div>
        </div>
        <Link href="/skills/simulations/new" style={{ textDecoration: "none" }}>
          <Button variant="primary">New simulation</Button>
        </Link>
      </div>

      <SimulationsList />
    </div>
  );
}
