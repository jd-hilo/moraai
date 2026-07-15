import Link from "next/link";
import { SimulationsList } from "@/components/skills/simulations/simulations-list";
import styles from "@/components/skills/simulations/simulations.module.css";

export const dynamic = "force-dynamic";

export default function SimulationsPage() {
  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <span>Skills</span>
        <span className={styles.breadcrumbSeparator} aria-hidden="true">/</span>
        <span aria-current="page">Simulations</span>
      </nav>

      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Future paths</p>
          <h1 className={styles.title}>See a decision from ten directions.</h1>
          <p className={styles.description}>
            Mora draws on what it knows about you to explore ten plausible paths,
            then brings the patterns, risks, and likely outcomes into one report.
          </p>
        </div>
        <Link className={styles.primaryAction} href="/skills/simulations/new">
          New simulation
          <ArrowIcon />
        </Link>
      </header>

      <SimulationsList />
    </div>
  );
}

function ArrowIcon() {
  return (
    <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
