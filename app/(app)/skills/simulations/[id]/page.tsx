import { SimulationDashboard } from "@/components/skills/simulations/simulation-dashboard";
import styles from "@/components/skills/simulations/simulations.module.css";

export const dynamic = "force-dynamic";

export default async function SimulationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className={styles.page}>
      <SimulationDashboard simulationId={id} />
    </div>
  );
}
