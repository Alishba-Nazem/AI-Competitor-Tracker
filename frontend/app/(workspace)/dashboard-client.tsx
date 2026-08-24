"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BriefingPanel } from "@/components/briefing-panel";
import { FindingList, MarketPanel, SentimentPanel } from "@/components/intelligence";
import { useToast } from "@/components/toast";
import { EmptyState, StatCard, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { hostname } from "@/lib/format";
import type {
  Competitor,
  DashboardSummary,
  IntelligenceBriefing,
  IntelligenceDashboard,
} from "@/lib/types";

const AddCompetitorModal = dynamic(
  () => import("@/components/forms").then((mod) => mod.AddCompetitorModal),
  { ssr: false },
);

export function DashboardClient() {
  const { pushToast } = useToast();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [data, setData] = useState<IntelligenceDashboard | null>(null);
  const [briefing, setBriefing] = useState<IntelligenceBriefing | null>(null);
  const [briefingLoading, setBriefingLoading] = useState(true);
  const [briefingError, setBriefingError] = useState<string | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setBriefingLoading(true);
    setBriefingError(null);
    try {
      const [dashboard, nextCompetitors, nextSummary] = await Promise.all([
        api.getIntelligenceDashboard(),
        api.getCompetitors(),
        api.getDashboardSummary().catch(() => null),
      ]);
      setData(dashboard);
      setCompetitors(nextCompetitors);
      setSummary(nextSummary);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }

    try {
      setBriefing(await api.getIntelligenceBriefing());
    } catch (error) {
      setBriefing(null);
      setBriefingError(
        error instanceof Error ? error.message : "Failed to load AI briefing.",
      );
    } finally {
      setBriefingLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const profile = data?.profile;

  return (
    <>
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {profile?.businessName ?? "Competitor research"}
          </h1>
          <p className="mt-1 text-sm text-stone-700">
            {profile
              ? `${profile.category} · ${profile.country}. What competitors sell, charge, and what customers say.`
              : "Research findings from tracked competitor stores."}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" className="button-secondary" onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
          <button type="button" className="button-primary" onClick={() => setAddOpen(true)}>
            Add Competitor
          </button>
        </div>
      </header>

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

      {loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-4">
          <section className="border border-slate-200 bg-white" aria-labelledby="briefing-heading">
            <SectionHead title="AI briefing" titleId="briefing-heading" />
            <BriefingPanel
              briefing={briefing}
              loading={briefingLoading}
              error={briefingError}
            />
          </section>

          <section className="border border-slate-200 bg-white" aria-labelledby="changed-heading">
            <SectionHead title="What changed" titleId="changed-heading" />
            <FindingList
              findings={data.findings.filter(
                (item) =>
                  item.kind === "PRICE_DECREASE" ||
                  item.kind === "PRICE_INCREASE" ||
                  item.kind === "NEW_PRODUCT",
              )}
              emptyText="No price or product changes yet. Capture prices at least twice in a competitor workspace."
            />
          </section>

          <section className="border border-slate-200 bg-white" aria-labelledby="sentiment-heading">
            <SectionHead
              title="How customers rate competitors"
              titleId="sentiment-heading"
              action={
                <span className="text-xs text-stone-600">
                  From {data.market.reviewCount} stored review
                  {data.market.reviewCount === 1 ? "" : "s"}
                </span>
              }
            />
            <div className="px-4 py-4">
              <SentimentPanel market={data.market} />
            </div>
          </section>

          <section className="border border-slate-200 bg-white" aria-labelledby="customers-heading">
            <SectionHead title="What customers are saying" titleId="customers-heading" />
            <FindingList
              findings={data.findings.filter(
                (item) =>
                  item.kind === "CUSTOMER_LIKE" ||
                  item.kind === "CUSTOMER_COMPLAINT" ||
                  item.kind === "REPEATED_NEED",
              )}
              emptyText="No customer themes yet. Capture public reviews from competitor workspaces."
            />
          </section>

          <section className="border border-slate-200 bg-white" aria-labelledby="gaps-heading">
            <SectionHead title="Market gaps" titleId="gaps-heading" />
            <div className="px-4 py-4">
              <MarketPanel market={data.market} />
            </div>
          </section>

          <section className="border border-slate-200 bg-white" aria-labelledby="competitors-heading">
            <SectionHead
              title="Competitors"
              titleId="competitors-heading"
              action={
                <Link href="/competitors" className="text-sm font-medium text-stone-700 hover:text-slate-900">
                  View all
                </Link>
              }
            />
            {competitors.length === 0 ? (
              <div className="px-4 py-6">
                <EmptyState
                  title="No competitors yet"
                  text="Add a Shopify store, Daraz shop, or other store URL. Products are discovered when the platform is supported."
                  actionLabel="Add Competitor"
                  onAction={() => setAddOpen(true)}
                />
              </div>
            ) : (
              <div className="table-wrap">
                <table className="min-w-[640px]" aria-label="Tracked competitors">
                  <caption className="sr-only">Tracked competitor stores</caption>
                  <thead>
                    <tr>
                      <th>Competitor</th>
                      <th>Website</th>
                      <th>Status</th>
                      <th className="text-right">Workspace</th>
                    </tr>
                  </thead>
                  <tbody>
                    {competitors.map((competitor) => (
                      <tr key={competitor.id}>
                        <td>
                          <Link
                            href={`/competitors/${competitor.id}`}
                            className="font-medium text-slate-900 hover:underline"
                          >
                            {competitor.name}
                          </Link>
                        </td>
                        <td>
                          <a className="table-link" href={competitor.url} target="_blank" rel="noreferrer">
                            {hostname(competitor.url)}
                            <span className="sr-only"> (opens in a new tab)</span>
                          </a>
                        </td>
                        <td>
                          <StatusBadge active={competitor.isActive} />
                        </td>
                        <td className="text-right">
                          <Link
                            href={`/competitors/${competitor.id}`}
                            className="button-secondary !px-2.5 !py-1.5 !text-xs"
                          >
                            Open workspace
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      <AddCompetitorModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          void load();
        }}
      />
    </>
  );
}

function SectionHead({
  title,
  titleId,
  action,
}: {
  title: string;
  titleId?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
      <h2 id={titleId} className="text-sm font-semibold text-slate-900">
        {title}
      </h2>
      {action}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" role="status">
      <p className="sr-only">Loading dashboard</p>
      <div className="h-48 border border-slate-200 bg-white" aria-hidden="true" />
    </div>
  );
}
