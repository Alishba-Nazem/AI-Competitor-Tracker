"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/toast";
import { EmptyState, LoadingState, PageHeader, Panel, AvailabilityBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { dateTimeLabel, formatPrice } from "@/lib/format";
import type { Snapshot, SnapshotProduct } from "@/lib/types";

export default function SnapshotsPage() {
  const { pushToast } = useToast();
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotProducts, setSnapshotProducts] = useState<Record<number, SnapshotProduct[]>>({});
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const nextSnapshots = await api.getSnapshots();
      const sorted = [...nextSnapshots].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id,
      );
      setSnapshots(sorted);
      const maps = await Promise.all(
        sorted.slice(0, 40).map(async (snapshot) => {
          const items = await api.getSnapshotProducts(snapshot.id);
          return [snapshot.id, items] as const;
        }),
      );
      setSnapshotProducts(Object.fromEntries(maps));
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Failed to load snapshots.");
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

  return (
    <>
      <PageHeader
        title="Snapshots"
        subtitle="Global capture history. For day-to-day work, use each competitor workspace."
        actions={
          <button type="button" className="button-secondary" onClick={() => void load()}>
            Refresh
          </button>
        }
      />

      <Panel>
        {loading ? (
          <LoadingState text="Loading snapshots…" />
        ) : snapshots.length === 0 ? (
          <EmptyState
            title="No snapshots yet"
            text="Capture prices from a competitor workspace to create history."
          />
        ) : (
          <div className="table-wrap">
            <table className="min-w-[720px]">
              <thead>
                <tr>
                  <th>Date & time</th>
                  <th>Competitor</th>
                  <th>Product</th>
                  <th className="text-right">Price</th>
                  <th>Availability</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {snapshots.flatMap((snapshot) => {
                  const captured = snapshotProducts[snapshot.id] ?? [];
                  const competitorName =
                    snapshot.competitor?.name ?? `Competitor #${snapshot.competitorId}`;
                  const competitorCell = (
                    <Link
                      href={`/products?competitorId=${snapshot.competitorId}`}
                      className="font-semibold text-slate-900 hover:text-teal-700"
                    >
                      {competitorName}
                    </Link>
                  );

                  if (captured.length === 0) {
                    return [
                      <tr key={`${snapshot.id}-loading`}>
                        <td className="whitespace-nowrap">{dateTimeLabel(snapshot.createdAt)}</td>
                        <td>{competitorCell}</td>
                        <td className="text-slate-400">Loading…</td>
                        <td className="text-right text-slate-400">—</td>
                        <td className="text-slate-400">—</td>
                        <td>
                          <span className="badge badge-green">Captured</span>
                        </td>
                      </tr>,
                    ];
                  }

                  return captured.map((product) => (
                    <tr key={`${snapshot.id}-${product.id}`}>
                      <td className="whitespace-nowrap">{dateTimeLabel(snapshot.createdAt)}</td>
                      <td>{competitorCell}</td>
                      <td>
                        <span className="block max-w-[18rem] truncate font-medium text-slate-800" title={product.name}>
                          {product.name}
                        </span>
                      </td>
                      <td className="whitespace-nowrap text-right">
                        <span className="font-bold text-slate-900">
                          {formatPrice(Number(product.price), product.currency)}
                        </span>
                      </td>
                      <td>
                        <AvailabilityBadge value={product.availability} />
                      </td>
                      <td>
                        <span className="badge badge-green">Captured</span>
                      </td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
