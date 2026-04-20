import { SimulationDashboard } from "@/components/skills/simulations/simulation-dashboard";

export const dynamic = "force-dynamic";

export default async function SimulationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div
      style={{
        maxWidth: 1080,
        margin: "0 auto",
        padding: "48px 24px 80px",
        width: "100%",
      }}
    >
      <SimulationDashboard simulationId={id} />
    </div>
  );
}
