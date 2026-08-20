"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AddCompetitorModal } from "@/components/forms";
import { FindingList, MarketPanel } from "@/components/intelligence";
import { useToast } from "@/components/toast";
import { EmptyState, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { hostname } from "@/lib/format";
import type { Competitor, IntelligenceDashboard } from "@/lib/types";

export function DashboardClient() {
  const { pushToast } = useToast();
  const [data, setData] = useState<IntelligenceDashboard | null>(null);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dashboard, nextCompetitors] = await Promise.all([
        api.getIntelligenceDashboard(),
        api.getCompetitors(),
      ]);
      setData(dashboard);
      setCompetitors(nextCompetitors);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Failed to load dashboard.");
    } finally {
      setLoading(false);
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
          <p className="mt-1 text-sm text-slate-500">
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

      {loading || !data ? (
        <DashboardSkeleton />
      ) : (
        <div className="space-y-4">
          <section className="border border-slate-200 bg-white">
            <SectionHead title="What changed" />
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

          <section className="border border-slate-200 bg-white">
            <SectionHead title="What customers are saying" />
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

          <section className="border border-slate-200 bg-white">
            <SectionHead title="Market gaps" />
            <div className="px-4 py-4">
              <MarketPanel market={data.market} />
            </div>
          </section>

          <section className="border border-slate-200 bg-white">
            <SectionHead
              title="Competitors"
              action={
                <Link href="/competitors" className="text-sm font-medium text-slate-600 hover:text-slate-900">
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
                <table className="min-w-[640px]">
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

function SectionHead({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5">
      <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      {action}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <div className="h-48 border border-slate-200 bg-white" />
    </div>
  );
}
