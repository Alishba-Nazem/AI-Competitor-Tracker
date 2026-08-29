"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AddProductModal } from "@/components/forms";
import { Product3DModal } from "@/components/product-3d/product-3d-modal";
import { useToast } from "@/components/toast";
import {
  CaptureStatusBadge,
  EmptyState,
  LoadingState,
  PageHeader,
  Panel,
} from "@/components/ui";
import { api } from "@/lib/api";
import {
  dateTimeLabel,
  formatPrice,
  isAwaitingCapture,
  productLastChecked,
} from "@/lib/format";
import type { Competitor, Product, Snapshot, SnapshotProduct } from "@/lib/types";

export default function ProductsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { pushToast } = useToast();

  const competitorParam = searchParams.get("competitorId");
  const selectedCompetitorId =
    competitorParam && Number.isFinite(Number(competitorParam)) ? Number(competitorParam) : null;

  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotProducts, setSnapshotProducts] = useState<Record<number, SnapshotProduct[]>>({});
  const [loading, setLoading] = useState(true);
  const [capturingCompetitorId, setCapturingCompetitorId] = useState<number | null>(null);
  const [failedProductIds, setFailedProductIds] = useState<number[]>([]);
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [product3DView, setProduct3DView] = useState<Product | null>(null);

  const selectedCompetitor = useMemo(
    () => competitors.find((item) => item.id === selectedCompetitorId) ?? null,
    [competitors, selectedCompetitorId],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [nextCompetitors, nextProducts, nextSnapshots] = await Promise.all([
        api.getCompetitors(),
        selectedCompetitorId ? api.getProducts(selectedCompetitorId) : api.getProducts(),
        selectedCompetitorId
          ? api.getSnapshotsByCompetitor(selectedCompetitorId)
          : api.getSnapshots(),
      ]);
      setCompetitors(nextCompetitors);
      setProducts(nextProducts);
      setSnapshots(nextSnapshots);

      const relevantSnapshots = [...nextSnapshots]
        .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id)
        .slice(0, selectedCompetitorId ? 3 : 8);

      const maps = await Promise.all(
        relevantSnapshots.map(async (snapshot) => {
          const items = await api.getSnapshotProducts(snapshot.id);
          return [snapshot.id, items] as const;
        }),
      );
      setSnapshotProducts(Object.fromEntries(maps));
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Failed to load products.");
    } finally {
      setLoading(false);
    }
  }, [pushToast, selectedCompetitorId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    if (searchParams.get("addProduct") !== "1") return;
    if (!selectedCompetitorId) return;
    const timer = window.setTimeout(() => {
      setAddProductOpen(true);
      router.replace(`/products?competitorId=${selectedCompetitorId}`);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [router, searchParams, selectedCompetitorId]);

  const visibleProducts = useMemo(() => {
    if (!selectedCompetitorId) return products;
    return products.filter((product) => product.competitorId === selectedCompetitorId);
  }, [products, selectedCompetitorId]);

  function setCompetitorFilter(value: string) {
    if (!value) {
      router.replace("/products");
      return;
    }
    router.replace(`/products?competitorId=${value}`);
  }

  async function captureForProduct(product: Product) {
    setCapturingCompetitorId(product.competitorId);
    try {
      const result = await api.captureCompetitor(product.competitorId);
      setFailedProductIds(result.failedProducts.map((item) => item.productId));
      pushToast(
        "success",
        `Captured ${result.capturedProducts.length} price${result.capturedProducts.length === 1 ? "" : "s"}${
          result.failedProducts.length ? `; ${result.failedProducts.length} failed.` : "."
        }`,
      );
      await load();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Unable to capture prices.");
    } finally {
      setCapturingCompetitorId(null);
    }
  }

  const pageTitle = selectedCompetitor
    ? `${selectedCompetitor.name} → Products`
    : "Products";

  const pageSubtitle = selectedCompetitor
    ? `Only products for ${selectedCompetitor.name}. Add a URL and capture to discover the price.`
    : "Filter by competitor or view all tracked products.";

  return (
    <>
      <PageHeader
        title={pageTitle}
        subtitle={pageSubtitle}
        actions={
          <>
            <button type="button" className="button-secondary" onClick={() => void load()}>
              Refresh
            </button>
            <button
              type="button"
              className="button-primary"
              disabled={!selectedCompetitorId && competitors.length === 0}
              onClick={() => {
                if (!selectedCompetitorId) {
                  pushToast("error", "Select a competitor before adding a product.");
                  return;
                }
                setAddProductOpen(true);
              }}
            >
              + Add Product
            </button>
          </>
        }
      />

      <Panel>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="block max-w-sm flex-1">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-stone-700">
              Competitor filter
            </span>
            <select
              value={selectedCompetitorId ? String(selectedCompetitorId) : ""}
              onChange={(event) => setCompetitorFilter(event.target.value)}
            >
              <option value="">All Competitors</option>
              {competitors.map((competitor) => (
                <option key={competitor.id} value={competitor.id}>
                  {competitor.name}
                </option>
              ))}
            </select>
          </label>
          {selectedCompetitor && (
            <p className="text-sm font-semibold text-slate-700">
              Showing products for <span className="text-teal-700">{selectedCompetitor.name}</span>
            </p>
          )}
        </div>

        {loading ? (
          <LoadingState text="Loading products…" />
        ) : competitors.length === 0 ? (
          <EmptyState
            title="No competitors yet"
            text="Add a competitor first, then you’ll land here to add products."
          />
        ) : visibleProducts.length === 0 ? (
          <EmptyState
            title={selectedCompetitor ? `No products for ${selectedCompetitor.name}` : "No products yet"}
            text={
              selectedCompetitor
                ? "Add a product name and URL. Price is discovered when you capture."
                : "Select a competitor, then add product URLs to track."
            }
            actionLabel={selectedCompetitorId ? "+ Add Product" : undefined}
            onAction={selectedCompetitorId ? () => setAddProductOpen(true) : undefined}
          />
        ) : (
          <div className="table-wrap">
            <table className="min-w-[960px]">
              <thead>
                <tr>
                  <th>Product</th>
                  {!selectedCompetitorId && <th>Competitor</th>}
                  <th>URL</th>
                  <th className="text-right">Current price</th>
                  <th>Currency</th>
                  <th>Last checked</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleProducts.map((product) => {
                  const competitor = competitors.find((item) => item.id === product.competitorId);
                  const pending = isAwaitingCapture(product.currentPrice);
                  const lastChecked = productLastChecked(product.id, snapshots, snapshotProducts);
                  const capturing = capturingCompetitorId === product.competitorId;
                  const failed = failedProductIds.includes(product.id);

                  return (
                    <tr key={product.id}>
                      <td>
                        <span
                          className="block max-w-[16rem] truncate font-semibold text-slate-900"
                          title={product.name}
                        >
                          {product.name}
                        </span>
                      </td>
                      {!selectedCompetitorId && (
                        <td className="font-medium text-slate-700">{competitor?.name ?? "Unknown"}</td>
                      )}
                      <td>
                        <a
                          href={product.url}
                          target="_blank"
                          rel="noreferrer"
                          className="table-link block max-w-[18rem] truncate"
                          title={product.url}
                        >
                          {product.url}
                        </a>
                      </td>
                      <td className="whitespace-nowrap text-right">
                        {pending ? (
                          <span className="text-stone-600">Awaiting capture</span>
                        ) : (
                          <span className="font-bold text-slate-900">
                            {formatPrice(Number(product.currentPrice), product.currency)}
                          </span>
                        )}
                      </td>
                      <td>{pending ? "—" : product.currency}</td>
                      <td className="whitespace-nowrap">{dateTimeLabel(lastChecked)}</td>
                      <td>
                        <CaptureStatusBadge pending={pending} capturing={capturing} failed={failed} />
                      </td>
                      <td>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className="button-secondary !py-2 !text-xs"
                            onClick={() => setProduct3DView(product)}
                          >
                            View in 3D
                          </button>
                          <button
                            type="button"
                            className="button-primary !py-2 !text-xs"
                            disabled={!competitor?.isActive || capturing}
                            onClick={() => void captureForProduct(product)}
                          >
                            {capturing ? "Capturing…" : "Capture Now"}
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

      {selectedCompetitorId && (
        <AddProductModal
          open={addProductOpen}
          competitorId={selectedCompetitorId}
          competitorName={selectedCompetitor?.name}
          onClose={() => setAddProductOpen(false)}
          onCreated={load}
        />
      )}

      <Product3DModal product={product3DView} onClose={() => setProduct3DView(null)} />
    </>
  );
}
