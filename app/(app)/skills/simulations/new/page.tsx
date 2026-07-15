import Link from "next/link";
import { NewSimulationForm } from "@/components/skills/simulations/new-simulation-form";
import styles from "@/components/skills/simulations/simulations.module.css";

export default function NewSimulationPage() {
  return (
    <div className={`${styles.page} ${styles.pageNarrow}`}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <Link className={styles.breadcrumbLink} href="/skills/simulations">
          Simulations
        </Link>
        <span className={styles.breadcrumbSeparator} aria-hidden="true">/</span>
        <span aria-current="page">New</span>
      </nav>

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>New simulation</p>
          <h1 className={styles.title}>What future do you want to examine?</h1>
          <p className={styles.description}>
            Name one concrete choice or change. Mora will build ten distinct paths
            and compare how each could unfold over time.
          </p>
        </div>
      </header>

      <NewSimulationForm />
    </div>
  );
}
