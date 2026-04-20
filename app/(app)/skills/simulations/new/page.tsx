import Link from "next/link";
import { NewSimulationForm } from "@/components/skills/simulations/new-simulation-form";

export default function NewSimulationPage() {
  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "48px 24px 80px",
        width: "100%",
      }}
    >
      <Link
        href="/skills/simulations"
        style={{
          fontSize: 13,
          color: "#6e6e80",
          textDecoration: "none",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          marginBottom: 16,
        }}
      >
        ← All simulations
      </Link>

      <h1
        style={{
          fontSize: 28,
          fontWeight: 600,
          color: "#0d0d0d",
          margin: 0,
          marginBottom: 28,
        }}
      >
        New simulation
      </h1>

      <NewSimulationForm />
    </div>
  );
}
