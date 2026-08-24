"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  RatingHistogram,
  SentimentChart,
  ThemeBars,
  sentimentFromDistribution,
} from "@/components/charts";
import { FindingList } from "@/components/intelligence";
import { useToast } from "@/components/toast";
import {
  AvailabilityBadge,
  BackLink,
  CaptureStatusBadge,
  ChangeRow,
  EmptyState,
  LoadingState,
  Panel,
  ScrapeMethodBadge,
  StatusBadge,
  Tabs,
} from "@/components/ui";
import { api } from "@/lib/api";
import {
  dateTimeLabel,
  formatPrice,
  hostname,
  isAwaitingCapture,
  productLastChecked,
  relativeFuture,
  relativeTime,
} from "@/lib/format";
import type {
  ChangeDetectionResult,
  Competitor,
  CompetitorIntelligence,
  CompetitorReviews,
  Product,
  ProductPriceHistory,
  ProductReview,
  ReviewInsights,
  ReviewSummary,
  ScrapeProgress,
  Snapshot,
  SnapshotProduct,
} from "@/lib/types";

type WorkspaceTab = "overview" | "products" | "changes" | "reviews" | "insights" | "history";

const NO_THEMES = "No recurring themes in stored reviews.";

function productPriceTrend(
  productId: number,
  snapshots: Array<{ id: number; createdAt: string }>,
  snapshotProducts: Record<number, Array<{ productId: number; price: string | number }>>,
) {
  const recentPrices = [...snapshots]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id)
    .flatMap((snapshot) => {
      const match = (snapshotProducts[snapshot.id] ?? []).find((item) => item.productId === productId);
      return match ? [Number(match.price)] : [];
    })
    .slice(0, 2);

  if (recentPrices.length < 2) return null;
  if (recentPrices[0] > recentPrices[1]) {
    return { symbol: "↑", label: "price increased", className: "text-rose-700" };
  }
  if (recentPrices[0] < recentPrices[1]) {
    return { symbol: "↓", label: "price decreased", className: "text-emerald-700" };
  }
  return { symbol: "→", label: "stable", className: "text-stone-600" };
}

export default function CompetitorWorkspacePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { pushToast } = useToast();
  const competitorId = Number(params.id);

  const [competitor, setCompetitor] = useState<Competitor | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotProducts, setSnapshotProducts] = useState<Record<number, SnapshotProduct[]>>({});
  const [changes, setChanges] = useState<ChangeDetectionResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [capturing, setCapturing] = useState(false);
  const [capturingReviews, setCapturingReviews] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [failedProductIds, setFailedProductIds] = useState<number[]>([]);
  const [scrapeProgress, setScrapeProgress] = useState<ScrapeProgress | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>("overview");
  const [intelligence, setIntelligence] = useState<CompetitorIntelligence | null>(null);
  const [competitorReviews, setCompetitorReviews] = useState<CompetitorReviews | null>(null);
  const [selectedHistoryProductId, setSelectedHistoryProductId] = useState<number | null>(null);
  const [productHistory, setProductHistory] = useState<ProductPriceHistory | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedReviewProductId, setSelectedReviewProductId] = useState<number | null>(null);
  const [recentReviews, setRecentReviews] = useState<ProductReview[]>([]);
  const [insights, setInsights] = useState<ReviewInsights | null>(null);

  const load = useCallback(async () => {
    if (!Number.isFinite(competitorId)) return;
    setLoading(true);
    try {
      const [nextCompetitor, nextProducts, nextSnapshots, nextChanges, nextReviews, nextIntelligence] = await Promise.all([
        api.getCompetitor(competitorId),
        api.getProducts(competitorId),
        api.getSnapshotsByCompetitor(competitorId),
        api.getChanges(competitorId),
        api.getCompetitorReviews(competitorId).catch(() => null),
        api.getCompetitorIntelligence(competitorId).catch(() => null),
      ]);
      const sortedSnapshots = [...nextSnapshots].sort(
        (a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id,
      );
      setCompetitor(nextCompetitor);
      setProducts(nextProducts);
      setSnapshots(sortedSnapshots);
      setChanges(nextChanges);
      setCompetitorReviews(nextReviews);
      setIntelligence(nextIntelligence);

      // Only load the latest few snapshots for trends — History tab loads product history on demand.
      const productMaps = await Promise.all(
        sortedSnapshots.slice(0, 3).map(async (snapshot) => {
          const items = await api.getSnapshotProducts(snapshot.id);
          return [snapshot.id, items] as const;
        }),
      );
      setSnapshotProducts(Object.fromEntries(productMaps));
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Failed to load workspace.");
      setCompetitor(null);
    } finally {
      setLoading(false);
    }
  }, [competitorId, pushToast]);

  useEffect(() => {
    if (!capturing || !Number.isFinite(competitorId)) {
      setScrapeProgress(null);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const progress = await api.getScrapeProgress(competitorId);
        if (!cancelled) setScrapeProgress(progress);
      } catch {
        // Ignore transient poll failures while capture is in flight.
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [capturing, competitorId]);

  const reviewProductId = selectedReviewProductId ?? products[0]?.id ?? null;
  const historyProductId = selectedHistoryProductId ?? products[0]?.id ?? null;

  useEffect(() => {
    if (tab !== "history" || !historyProductId) {
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        setHistoryLoading(true);
        try {
          const nextHistory = await api.getProductPriceHistory(historyProductId);
          setProductHistory(nextHistory);
        } catch (error) {
          setProductHistory(null);
          pushToast("error", error instanceof Error ? error.message : "Failed to load price history.");
        } finally {
          setHistoryLoading(false);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [historyProductId, pushToast, tab]);

  useEffect(() => {
    if (tab !== "reviews" || !reviewProductId) {
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const [nextReviews, nextInsights] = await Promise.all([
            api.getProductReviews(reviewProductId),
            api.getProductReviewInsights(reviewProductId),
          ]);
          setRecentReviews(nextReviews);
          setInsights(nextInsights);
        } catch {
          setRecentReviews([]);
          setInsights(null);
        }
      })();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [tab, reviewProductId, competitorReviews]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const latestSnapshot = snapshots[0];

  async function discoverProducts() {
    if (!competitor) return;
    setDiscovering(true);
    try {
      const result = await api.discoverCompetitor(competitor.id);
      pushToast(
        "success",
        `Detected ${result.platform}. Saved ${result.created} product${result.created === 1 ? "" : "s"}.`,
      );
      await load();
      setTab("products");
    } catch (error) {
      pushToast(
        "error",
        error instanceof Error ? error.message : "Unable to discover products.",
      );
    } finally {
      setDiscovering(false);
    }
  }

  async function capturePrices() {
    if (!competitor) return;
    setCapturing(true);
    try {
      const result = await api.captureCompetitor(competitor.id);
      setFailedProductIds(result.failedProducts.map((item) => item.productId));
      pushToast(
        "success",
        `Captured ${result.capturedProducts.length} price${result.capturedProducts.length === 1 ? "" : "s"}${
          result.failedProducts.length ? `; ${result.failedProducts.length} failed.` : "."
        }`,
      );
      await load();
      setTab("products");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Unable to capture prices.");
    } finally {
      setCapturing(false);
    }
  }

  async function captureReviews() {
    if (!competitor) return;
    setCapturingReviews(true);
    try {
      const result = await api.captureCompetitorReviews(competitor.id);
      pushToast(
        "success",
        `Stored ${result.created} new review${result.created === 1 ? "" : "s"} from ${result.processed} product${result.processed === 1 ? "" : "s"}.`,
      );
      await load();
      setTab("reviews");
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Unable to capture reviews.");
    } finally {
      setCapturingReviews(false);
    }
  }

  async function deleteProduct(productId: number) {
    setDeletingProductId(productId);
    try {
      await api.deleteProduct(productId);
      pushToast("success", "Product removed.");
      await load();
    } catch (error) {
      pushToast("error", error instanceof Error ? error.message : "Unable to delete product.");
    } finally {
      setDeletingProductId(null);
    }
  }

  if (!Number.isFinite(competitorId)) {
    return <EmptyState title="Invalid competitor" text="This competitor link is not valid." />;
  }

  if (loading) return <LoadingState text="Loading competitor workspace…" />;

  if (!competitor) {
    return (
      <EmptyState
        title="Competitor not found"
        text="It may have been deleted. Return to the competitors list."
        actionLabel="Back to competitors"
        onAction={() => router.push("/competitors")}
      />
    );
  }

  return (
    <>
      <div className="mb-4">
        <BackLink href="/competitors" label="Back to Competitors" />
      </div>

      <section className="panel mb-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{competitor.name}</h1>
              <StatusBadge active={competitor.isActive} />
              {competitor.platform && competitor.platform !== "UNKNOWN" && (
                <span className="badge badge-gray">{competitor.platform}</span>
              )}
            </div>
            <a
              href={competitor.url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline"
            >
              {hostname(competitor.url)} ↗
            </a>
            <p className="mt-2 text-sm text-stone-600">
              {products.length} product{products.length === 1 ? "" : "s"} · Last synced{" "}
              {relativeTime(competitor.lastCapturedAt ?? latestSnapshot?.createdAt)}
              {competitor.nextCaptureAt ? ` · Next sync ${relativeFuture(competitor.nextCaptureAt)}` : ""}
            </p>
            {capturing ? (
              <div className="mt-3 max-w-md">
                <p className="text-sm font-medium text-slate-700">
                  Scraping {competitor.name}…{" "}
                  {scrapeProgress && scrapeProgress.total > 0
                    ? `${scrapeProgress.done}/${scrapeProgress.total}`
                    : "starting"}
                </p>
                <div className="mt-2 h-2 overflow-hidden rounded bg-slate-100">
                  <div
                    className="h-full bg-teal-600 transition-[width] duration-300"
                    style={{
                      width: `${
                        scrapeProgress && scrapeProgress.total > 0
                          ? Math.min(100, Math.round((scrapeProgress.done / scrapeProgress.total) * 100))
                          : 8
                      }%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {products.length === 0 ? (
              <button
                type="button"
                className="button-secondary"
                disabled={!competitor.isActive || discovering || capturing}
                onClick={() => void discoverProducts()}
              >
                {discovering ? "Discovering…" : "Discover products"}
              </button>
            ) : null}
            <button
              type="button"
              className="button-primary"
              disabled={!competitor.isActive || capturing || products.length === 0}
              onClick={() => void capturePrices()}
            >
              {capturing ? "Capturing prices…" : "Capture prices"}
            </button>
            <button
              type="button"
              className="button-secondary"
              disabled={!competitor.isActive || capturingReviews || products.length === 0}
              onClick={() => void captureReviews()}
            >
              {capturingReviews ? "Capturing reviews…" : "Capture reviews"}
            </button>
          </div>
        </div>
      </section>

      <div className="mb-4">
        <Tabs
          tabs={[
            { key: "overview", label: "Overview" },
            { key: "products", label: "Products", count: products.length },
            { key: "changes", label: "Price Changes", count: changes?.changes.length ?? 0 },
            { key: "reviews", label: "Reviews" },
            { key: "insights", label: "Insights" },
            { key: "history", label: "History", count: snapshots.length },
          ]}
          active={tab}
          onChange={(key) => setTab(key as WorkspaceTab)}
        />
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          <Panel title="Research overview" description="Latest captured changes and customer signals for this competitor.">
            <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Metric label="Products" value={intelligence?.summary.productCount ?? products.length} />
              <Metric label="Captured prices" value={intelligence?.summary.capturedProductCount ?? 0} />
              <Metric label="Reviews" value={intelligence?.summary.reviewCount ?? 0} />
              <div className="border border-slate-200 px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-600">Avg. price</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                  {intelligence?.summary.averagePrice != null
                    ? formatPrice(intelligence.summary.averagePrice, intelligence.summary.currency)
                    : "—"}
                </p>
              </div>
            </div>
            <FindingList
              findings={intelligence?.findings ?? []}
              emptyText="No findings yet. Capture prices twice and capture reviews to research this competitor."
            />
          </Panel>
        </div>
      )}

      {tab === "products" && (
        <Panel
          title="Tracked products"
          description="Products come from the store URL. Capture records real selling prices. Prices are never typed in."
        >
          {products.length === 0 ? (
            <EmptyState
              title="No products yet"
              text="Discover products from this competitor’s store or seller URL. Product URLs are not entered manually."
              actionLabel="Discover products"
              onAction={() => void discoverProducts()}
            />
          ) : (
            <div className="divide-y divide-slate-100">
              {products.map((product) => {
                const pending = isAwaitingCapture(product.currentPrice);
                const lastChecked = productLastChecked(product.id, snapshots, snapshotProducts);
                const trend = productPriceTrend(product.id, snapshots, snapshotProducts);
                const failed = failedProductIds.includes(product.id);
                const review = competitorReviews?.products.find((item) => item.productId === product.id);
                return (
                  <div
                    key={product.id}
                    className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-900">{product.name}</p>
                        <CaptureStatusBadge pending={pending} capturing={capturing} failed={failed} />
                        <ScrapeMethodBadge method={product.scrapeMethod} />
                      </div>
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 block truncate text-sm text-teal-700 hover:underline"
                      >
                        {product.url}
                      </a>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-600">
                        <span>
                          <span className="text-stone-700">Price · </span>
                          {pending ? (
                            "Awaiting capture"
                          ) : (
                            <span className="inline-flex items-center gap-2">
                              <span>{formatPrice(Number(product.currentPrice), product.currency)}</span>
                              {trend ? (
                                <span className={`text-xs font-semibold ${trend.className}`} title={trend.label}>
                                  {trend.symbol} {trend.label}
                                </span>
                              ) : null}
                            </span>
                          )}
                        </span>
                        <span>
                          <span className="text-stone-700">Currency · </span>
                          {pending ? "—" : product.currency}
                        </span>
                        <span>
                          <span className="text-stone-700">Availability · </span>
                          <AvailabilityBadge value={pending ? null : product.availability} />
                        </span>
                        <span>
                          <span className="text-stone-700">Rating · </span>
                          {review?.averageRating != null ? `${review.averageRating.toFixed(1)} / 5` : "—"}
                        </span>
                        <span>
                          <span className="text-stone-700">Reviews · </span>
                          {review?.available === false
                            ? "Unavailable"
                            : review
                              ? review.totalReviews
                              : "—"}
                        </span>
                        <span>
                          <span className="text-stone-700">Sentiment · </span>
                          {review?.available === false
                            ? "Reviews aren't publicly available"
                            : review && review.totalReviews === 0
                              ? "No customer reviews found"
                              : review?.positivePercent != null
                                ? `${review.positivePercent}% positive`
                                : "—"}
                        </span>
                        <span>
                          <span className="text-stone-700">Last checked · </span>
                          {dateTimeLabel(lastChecked)}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        className="button-danger"
                        disabled={deletingProductId === product.id}
                        onClick={() => void deleteProduct(product.id)}
                      >
                        {deletingProductId === product.id ? "Deleting…" : "Remove"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {tab === "history" && (
        <Panel title="Price history" description="Recent snapshots for this competitor.">
          {products.length === 0 ? (
            <EmptyState
              title="No products yet"
              text="Discover products from this competitor’s store or seller URL first."
              actionLabel="Discover products"
              onAction={() => {
                void discoverProducts();
              }}
            />
          ) : historyLoading ? (
            <LoadingState text="Loading price history…" />
          ) : (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Product</label>
                <select
                  className="max-w-xl"
                  value={historyProductId ?? ""}
                  onChange={(event) => setSelectedHistoryProductId(Number(event.target.value))}
                >
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              {!productHistory || productHistory.history.length === 0 ? (
                <EmptyState
                  title="No price history yet"
                  text="Run Capture to create the first price snapshot for this product."
                  actionLabel="Capture"
                  onAction={() => void capturePrices()}
                />
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th className="text-right">Price</th>
                        <th>Currency</th>
                        <th>Availability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...productHistory.history]
                        .sort(
                          (a, b) =>
                            Date.parse(b.capturedAt) - Date.parse(a.capturedAt) || b.snapshotId - a.snapshotId,
                        )
                        .map((point) => (
                          <tr key={point.snapshotId}>
                            <td className="whitespace-nowrap font-medium text-slate-800">
                              {dateTimeLabel(point.capturedAt)}
                            </td>
                            <td className="whitespace-nowrap text-right font-semibold tabular-nums text-slate-900">
                              {formatPrice(point.price, point.currency)}
                            </td>
                            <td className="whitespace-nowrap">{point.currency}</td>
                            <td>
                              <AvailabilityBadge value={point.availability} />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </Panel>
      )}

      {tab === "changes" && (
        <Panel
          title="Detected changes"
          description="Compared from the latest two snapshots."
          action={
            <Link href="/changes" className="button-secondary">
              All changes
            </Link>
          }
        >
          {!changes || changes.changes.length === 0 ? (
            <EmptyState
              title="No changes detected"
              text="Capture prices at least twice to compare snapshots and surface price, availability, new, or removed products."
            />
          ) : (
            <div>
              {changes.changes.map((change) => (
                <ChangeRow
                  key={`${change.productId}-${change.type}`}
                  change={change}
                  detectedAt={dateTimeLabel(latestSnapshot?.createdAt)}
                  detailed
                />
              ))}
            </div>
          )}
        </Panel>
      )}

      {tab === "reviews" && (
        <ReviewsPanel
          products={competitorReviews?.products ?? []}
          selectedProductId={selectedReviewProductId ?? products[0]?.id ?? null}
          onSelect={setSelectedReviewProductId}
          recentReviews={recentReviews}
          insights={insights}
          capturing={capturingReviews}
          onCapture={() => void captureReviews()}
        />
      )}

      {tab === "insights" && (
        <Panel
          title="Competitor insights"
          description="Built from stored reviews and captured prices only. Nothing is invented."
        >
          {!intelligence || intelligence.summary.reviewCount === 0 ? (
            <EmptyState
              title="No review insights yet"
              text="Capture public reviews for this competitor first."
              actionLabel="Capture reviews"
              onAction={() => void captureReviews()}
            />
          ) : !intelligence.enoughReviewData ? (
            <EmptyState
              title="Not enough review data"
              text={intelligence.reviewMessage ?? "Not enough review data for reliable insights."}
            />
          ) : (
            <div className="space-y-6">
              <SentimentChart sentiment={intelligence.sentiment} />
              <div className="grid gap-6 border-t border-slate-100 pt-5 md:grid-cols-3">
                <ThemeBars
                  title="Customers like"
                  items={intelligence.likes}
                  tone="positive"
                  empty="No positive themes yet."
                />
                <ThemeBars
                  title="Customers dislike"
                  items={intelligence.dislikes}
                  tone="negative"
                  empty="No repeated complaints yet."
                />
                <ThemeBars
                  title="Repeated needs"
                  items={intelligence.repeatedNeeds}
                  tone="accent"
                  empty="No repeated themes yet."
                />
              </div>
              {intelligence.opportunities.length > 0 ? (
                <div className="border-t border-slate-100 pt-4">
                  <h3 className="text-sm font-semibold text-slate-900">Possible gaps</h3>
                  {intelligence.opportunities.map((item) => (
                    <p key={item.title} className="mt-2 text-sm leading-6 text-slate-600">
                      {item.detail}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-stone-600">No repeated complaint pattern is strong enough to call a gap yet.</p>
              )}
            </div>
          )}
        </Panel>
      )}
    </>
  );
}

function ReviewsPanel({
  products,
  selectedProductId,
  onSelect,
  recentReviews,
  insights,
  capturing,
  onCapture,
}: {
  products: ReviewSummary[];
  selectedProductId: number | null;
  onSelect: (id: number) => void;
  recentReviews: ProductReview[];
  insights: ReviewInsights | null;
  capturing: boolean;
  onCapture: () => void;
}) {
  const selected = products.find((item) => item.productId === selectedProductId) ?? products[0];

  if (products.length === 0) {
    return (
      <Panel title="Reviews" description="Capture reviews after products are discovered.">
        <EmptyState
          title="No products to review"
          text="Discover products first, then capture public reviews."
        />
      </Panel>
    );
  }

  const distribution = selected?.ratingDistribution ?? {};

  return (
    <div className="space-y-4">
      <Panel
        title="Reviews"
        description="Only stored customer reviews are shown. Nothing is invented."
        action={
          <button type="button" className="button-secondary" disabled={capturing} onClick={onCapture}>
            {capturing ? "Capturing reviews…" : "Capture reviews"}
          </button>
        }
      >
        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">Product</label>
          <select
            className="max-w-xl"
            value={selected?.productId ?? ""}
            onChange={(event) => onSelect(Number(event.target.value))}
          >
            {products.map((product) => (
              <option key={product.productId} value={product.productId}>
                {product.name}
              </option>
            ))}
          </select>
        </div>
        {selected?.available === false ? (
          <EmptyState title="Reviews unavailable" text="Reviews aren't publicly available for this product." />
        ) : selected && selected.totalReviews === 0 ? (
          <EmptyState title="No reviews" text="No customer reviews found." />
        ) : selected ? (
          <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
            <SentimentChart sentiment={sentimentFromDistribution(distribution, selected.totalReviews)} />
            <RatingHistogram distribution={distribution} />
          </div>
        ) : null}
      </Panel>

      <Panel title="Insights">
        {!insights || insights.enoughData === false ? (
          <EmptyState
            title="Not enough review data"
            text={insights?.message ?? "Not enough review data for reliable insights."}
          />
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <ThemeBars title="What customers like" items={insights.likes} tone="positive" empty={NO_THEMES} />
            <ThemeBars title="What customers dislike" items={insights.dislikes} tone="negative" empty={NO_THEMES} />
            <ThemeBars title="Common themes" items={insights.themes} tone="accent" empty={NO_THEMES} />
            <ThemeBars title="Important complaints" items={insights.complaints} tone="neutral" empty={NO_THEMES} />
          </div>
        )}
      </Panel>

      <Panel title="Recent reviews">
        {recentReviews.length === 0 ? (
          <EmptyState title="No reviews" text="No customer reviews found." />
        ) : (
          <div className="divide-y divide-slate-100">
            {recentReviews.slice(0, 12).map((review) => (
              <div key={review.id} className="py-4 first:pt-0 last:pb-0">
                <p className="text-sm font-semibold text-slate-800">
                  {review.rating != null ? `${review.rating}/5` : "Unrated"}
                  {review.reviewDate ? ` · ${dateTimeLabel(review.reviewDate)}` : ""}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{review.text}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-slate-200 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-stone-600">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{value}</p>
    </div>
  );
}
