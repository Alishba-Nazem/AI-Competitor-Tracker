import { StatCard } from "@/components/ui";
import { API_BASE_URL } from "@/lib/api";
import type { DashboardSummary } from "@/lib/types";
import { DashboardClient } from "./dashboard-client";

async function loadSummary(): Promise<DashboardSummary | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/dashboard/summary`, {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json()) as DashboardSummary;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const summary = await loadSummary();

  return (
    <>
      {summary ? (
        <section className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="Tracker summary">
          <StatCard
            label="Competitors"
            value={summary.competitors}
            detail="Tracked competitor stores"
          />
          <StatCard
            label="Products"
            value={summary.products}
            detail="Discovered catalog items"
          />
          <StatCard
            label="Changes this week"
            value={summary.changesThisWeek}
            detail="Snapshot diffs in the last 7 days"
          />
          <StatCard
            label="Reviews"
            value={summary.reviews}
            detail="Stored public customer reviews"
          />
        </section>
      ) : null}
      <DashboardClient />
    </>
  );
}
