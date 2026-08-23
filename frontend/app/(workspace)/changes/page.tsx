"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useToast } from "@/components/toast";
import { ChangeRow, EmptyState, LoadingState, PageHeader, Panel, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import { dateTimeLabel } from "@/lib/format";
import type {
  ChangeType,
  CompetitorChangeLog,
  CompetitorChangeLogEntry,
  Competitor,
  DetectedChange,
} from "@/lib/types";

export default function ChangesPage() {
  const { pushToast } = useToast();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [changeLogs, setChangeLogs] = useState<Record<number, CompetitorChangeLog>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | ChangeType>("ALL");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextCompetitors = await api.getCompetitors();
      setCompetitors(nextCompetitors);
      const results = await Promise.allSettled(
        nextCompetitors.map((competitor) => api.getCompetitorChangeLog(competitor.id)),
      );
      const mapped: Record<number, CompetitorChangeLog> = {};
      results.forEach((result, index) => {
        if (result.status === "fulfilled") mapped[nextCompetitors[index].id] = result.value;
      });
      setChangeLogs(mapped);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Failed to load changes.");
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

  const allItems = useMemo(() => {
    const rows: Array<{
      competitor: Competitor;
      entry: CompetitorChangeLogEntry;
      change: DetectedChange;
    }> = [];
    for (const competitor of competitors) {
      for (const entry of changeLogs[competitor.id]?.entries ?? []) {
        for (const change of entry.changes) {
          rows.push({ competitor, entry, change });
        }
      }
    }
    return rows;
  }, [changeLogs, competitors]);

  const filteredItems = useMemo(
    () => (filter === "ALL" ? allItems : allItems.filter((row) => row.change.type === filter)),
    [allItems, filter],
  );

  const summary = useMemo(() => {
    const counts: Record<ChangeType, number> = {
      PRICE_INCREASE: 0,
      PRICE_DECREASE: 0,
      NEW_PRODUCT: 0,
      REMOVED_PRODUCT: 0,
      AVAILABILITY_CHANGE: 0,
    };
    for (const item of allItems) {
      counts[item.change.type] += 1;
    }
    return counts;
  }, [allItems]);

  const groupedItems = useMemo(() => {
    const groups = new Map<
      number,
      {
        competitor: Competitor;
        entries: Array<{
          entry: CompetitorChangeLogEntry;
          changes: DetectedChange[];
        }>;
      }
    >();

    for (const item of filteredItems) {
      const existing =
        groups.get(item.competitor.id) ??
        {
          competitor: item.competitor,
          entries: [],
        };
      let entryGroup = existing.entries.find(
        (candidate) =>
          candidate.entry.latestSnapshotId === item.entry.latestSnapshotId &&
          candidate.entry.previousSnapshotId === item.entry.previousSnapshotId,
      );
      if (!entryGroup) {
        entryGroup = {
          entry: item.entry,
          changes: [],
        };
        existing.entries.push(entryGroup);
      }
      entryGroup.changes.push(item.change);
      groups.set(item.competitor.id, existing);
    }

    return competitors
      .map((competitor) => groups.get(competitor.id))
      .filter((group): group is NonNullable<typeof group> => Boolean(group));
  }, [competitors, filteredItems]);

  return (
    <>
      <PageHeader
        title="Price Changes"
        subtitle="Increases, decreases, availability, new products, and removals across competitors."
        actions={
          <button type="button" className="button-secondary" onClick={() => void load()}>
            Refresh
          </button>
        }
      />

      <section className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-5" aria-label="Change summary">
        <StatCard label="Price increases" value={summary.PRICE_INCREASE} detail="Historical upward price movements" />
        <StatCard label="Price decreases" value={summary.PRICE_DECREASE} detail="Historical downward price movements" />
        <StatCard label="New products" value={summary.NEW_PRODUCT} detail="Products newly discovered in later snapshots" />
        <StatCard label="Removed products" value={summary.REMOVED_PRODUCT} detail="Products missing from later snapshots" />
        <StatCard label="Availability changes" value={summary.AVAILABILITY_CHANGE} detail="Stock status changes across captures" />
      </section>

      <Panel>
        <div className="mb-4 flex flex-wrap gap-2">
          {(["ALL", "PRICE_INCREASE", "PRICE_DECREASE", "AVAILABILITY_CHANGE", "NEW_PRODUCT", "REMOVED_PRODUCT"] as const).map(
            (type) => (
              <button
                key={type}
                type="button"
                onClick={() => setFilter(type)}
                className={`filter-chip ${filter === type ? "filter-chip-active" : ""}`}
              >
                {type === "ALL" ? "All" : type.replaceAll("_", " ").toLowerCase()}
              </button>
            ),
          )}
        </div>

        {loading ? (
          <LoadingState text="Comparing snapshots…" />
        ) : allItems.length === 0 ? (
          <EmptyState
            title="No changes to show"
            text="Open a competitor workspace, capture prices twice, then return here for a cross-competitor view."
          />
        ) : groupedItems.length === 0 ? (
          <EmptyState
            title="No matching changes"
            text={
              filter === "PRICE_INCREASE" || filter === "PRICE_DECREASE"
                ? "Price increases/decreases appear only after Capture prices runs twice and a live selling price actually changes. Click All or new product to see other events."
                : "Try a different filter to see other historical change events."
            }
          />
        ) : (
          <div className="space-y-6">
            {groupedItems.map(({ competitor, entries }) => (
              <section key={competitor.id} className="border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <h2 className="text-sm font-semibold text-slate-900">{competitor.name}</h2>
                  <p className="mt-1 text-sm text-stone-600">
                    {entries.reduce((count, entry) => count + entry.changes.length, 0)} historical change
                    {entries.reduce((count, entry) => count + entry.changes.length, 0) === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="px-4">
                  {entries.map(({ entry, changes }) => (
                    <div key={`${competitor.id}-${entry.latestSnapshotId}-${entry.previousSnapshotId}`} className="py-4">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.08em] text-stone-600">
                        {dateTimeLabel(entry.detectedAt)} · Snapshot {entry.latestSnapshotId} vs {entry.previousSnapshotId}
                      </p>
                      <div>
                        {changes.map((change) => (
                          <ChangeRow
                            key={`${competitor.id}-${entry.latestSnapshotId}-${change.productId}-${change.type}`}
                            change={change}
                            detectedAt={`${dateTimeLabel(entry.detectedAt)} · Snapshot ${entry.latestSnapshotId} vs ${entry.previousSnapshotId}`}
                            detailed
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
