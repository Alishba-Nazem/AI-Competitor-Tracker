"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddCompetitorModal } from "@/components/forms";
import { useToast } from "@/components/toast";
import {
  Avatar,
  CaptureLogStatusBadge,
  EmptyState,
  LoadingState,
  PageHeader,
  Panel,
  StatusBadge,
} from "@/components/ui";
import { api } from "@/lib/api";
import { hostname, relativeFuture, relativeTime } from "@/lib/format";
import type { Competitor, Product, Snapshot } from "@/lib/types";

export default function CompetitorsPage() {
  const { pushToast } = useToast();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Competitor | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextCompetitors, nextProducts, nextSnapshots] = await Promise.all([
        api.getCompetitors(),
        api.getProducts(),
        api.getSnapshots(),
      ]);
      setCompetitors(nextCompetitors);
      setProducts(nextProducts);
      setSnapshots(nextSnapshots);
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Failed to load competitors.");
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

  const filtered = useMemo(
    () =>
      competitors.filter(
        (item) =>
          (status === "all" || String(item.isActive) === status) &&
          `${item.name} ${item.url}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [competitors, query, status],
  );

  async function deleteCompetitor() {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await api.deleteCompetitor(confirmDelete.id);
      pushToast("success", "Competitor deleted.");
      setConfirmDelete(null);
      await load();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Unable to delete competitor.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Competitors"
        subtitle="Open a competitor workspace to manage products and capture prices."
        actions={
          <button type="button" className="button-primary" onClick={() => setAddOpen(true)}>
            Add competitor
          </button>
        }
      />

      <Panel>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <input
            className="max-w-md"
            placeholder="Search competitors…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <select className="sm:w-40" value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        {loading ? (
          <LoadingState text="Loading competitors…" />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={competitors.length ? "No matches found" : "No competitors yet"}
            text={
              competitors.length
                ? "Try adjusting your search or filters."
                : "Add a Shopify store or Daraz shop URL. Products are discovered automatically."
            }
            actionLabel={competitors.length ? undefined : "Add competitor"}
            onAction={() => setAddOpen(true)}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Competitor</th>
                  <th>Website</th>
                  <th>Status</th>
                  <th>Products</th>
                  <th>Sync</th>
                  <th>Capture status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((competitor) => {
                  const count = products.filter((product) => product.competitorId === competitor.id).length;
                  const lastSynced =
                    competitor.lastCapturedAt ??
                    snapshots
                      .filter((snapshot) => snapshot.competitorId === competitor.id)
                      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0]?.createdAt;
                  return (
                    <tr key={competitor.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar name={competitor.name} />
                          <span className="font-semibold text-slate-900">{competitor.name}</span>
                        </div>
                      </td>
                      <td>
                        <a className="table-link" href={competitor.url} target="_blank" rel="noreferrer">
                          {hostname(competitor.url)}
                        </a>
                      </td>
                      <td>
                        <StatusBadge active={competitor.isActive} />
                      </td>
                      <td>{count}</td>
                      <td>
                        <div className="text-sm text-slate-700">
                          Last synced: {relativeTime(lastSynced)}
                        </div>
                        <div className="text-xs text-slate-500">
                          Next sync: {relativeFuture(competitor.nextCaptureAt)}
                          {competitor.captureFrequency
                            ? ` · ${competitor.captureFrequency === "WEEKLY" ? "Weekly" : "Daily"}`
                            : ""}
                        </div>
                      </td>
                      <td>
                        <CaptureLogStatusBadge status={competitor.latestCapture?.status} />
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/competitors/${competitor.id}`}
                            className="button-primary !py-2 !text-xs"
                          >
                            Open
                          </Link>
                          <button
                            type="button"
                            className="button-danger !py-2 !text-xs"
                            onClick={() => setConfirmDelete(competitor)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <AddCompetitorModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => {
          void load();
        }}
      />

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/40 p-4" onMouseDown={() => setConfirmDelete(null)}>
          <div
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-lg"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-slate-900">Delete competitor?</h2>
            <p className="mt-2 text-sm text-slate-600">
              This removes <span className="font-semibold">{confirmDelete.name}</span> and its tracked
              products, snapshots, and reviews.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" className="button-secondary" onClick={() => setConfirmDelete(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="button-danger"
                disabled={deletingId === confirmDelete.id}
                onClick={() => void deleteCompetitor()}
              >
                {deletingId === confirmDelete.id ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
