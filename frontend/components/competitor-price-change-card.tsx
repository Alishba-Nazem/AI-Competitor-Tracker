"use client";

import { ChangeBadge } from "@/components/ui";
import { availabilityLabel, formatPrice } from "@/lib/format";
import type {
  CompetitorDataChange,
  CompetitorProductRow,
  QueryCompetitorDataOutput,
  QueryPriceSummary,
} from "@/lib/ai/tools/query-competitor-data";

export function CompetitorPriceChangeCard({ result }: { result: QueryCompetitorDataOutput }) {
  if (result.hasChanges) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-600">
          {result.changeCount} captured change{result.changeCount === 1 ? "" : "s"}
        </p>
        <ul className="mt-2 space-y-2">
          {result.changes.map((change) => (
            <li key={`${change.competitorId}-${change.productId}-${change.detectedChange}`}>
              <PriceChangeRow change={change} />
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const status = result.status ?? inferStatus(result);
  if (status === "stable") {
    return (
      <div role="status">
        <p className="text-sm font-semibold text-slate-900">No price changes detected</p>
        <p className="mt-1 text-sm leading-6 text-stone-600">{result.message}</p>
        {result.priceSummary ? <PriceSummaryBlock summary={result.priceSummary} /> : null}
        {result.products.length > 0 ? <ProductList products={result.products} /> : null}
      </div>
    );
  }

  const title =
    status === "no_products"
      ? "No competitor products have been captured yet."
      : status === "no_competitors"
        ? "No competitors are currently being tracked."
        : "No matching competitor data found.";

  return (
    <div className="rounded border border-dashed border-slate-200 bg-slate-50/80 px-3 py-4" role="status">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {result.message && result.message !== title ? (
        <p className="mt-1 text-sm leading-6 text-stone-600">{result.message}</p>
      ) : null}
    </div>
  );
}

function inferStatus(result: QueryCompetitorDataOutput) {
  if (result.productCount > 0) return "stable" as const;
  if (result.competitorCount > 0) return "no_products" as const;
  return "no_match" as const;
}

function PriceSummaryBlock({ summary }: { summary: QueryPriceSummary }) {
  return (
    <dl className="mt-3 grid grid-cols-3 gap-2 text-sm">
      <Metric label="Minimum" value={formatPrice(summary.min, summary.currency)} />
      <Metric label="Median" value={formatPrice(summary.median, summary.currency)} />
      <Metric label="Maximum" value={formatPrice(summary.max, summary.currency)} />
    </dl>
  );
}

function ProductList({ products }: { products: CompetitorProductRow[] }) {
  return (
    <ul className="mt-3 space-y-1.5">
      {products.map((product) => (
        <li
          key={`${product.competitorId}-${product.productId}`}
          className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-slate-200 bg-white px-2.5 py-2 text-sm"
        >
          <span className="font-medium text-slate-900">{product.product}</span>
          <span className="text-stone-600">
            {formatPrice(product.currentPrice, product.currency)}
            <span className="ml-2 text-xs">{product.competitor}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function PriceChangeRow({ change }: { change: CompetitorDataChange }) {
  const isPrice =
    change.detectedChange === "PRICE_INCREASE" || change.detectedChange === "PRICE_DECREASE";
  const tone =
    change.detectedChange === "PRICE_DECREASE"
      ? "border-l-emerald-700 bg-emerald-50/40"
      : change.detectedChange === "PRICE_INCREASE"
        ? "border-l-rose-700 bg-rose-50/40"
        : "border-l-slate-400 bg-slate-50/60";

  return (
    <article className={`rounded border border-slate-200 border-l-4 bg-white px-3 py-3 ${tone}`}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{change.product}</h3>
        <ChangeBadge type={change.detectedChange} percentage={change.changePercentage} />
      </div>
      <p className="mt-1 text-xs text-stone-600">{change.competitor}</p>
      {isPrice ? (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <Metric label="Previous" value={formatPrice(change.previousPrice, change.currency)} />
          <Metric label="Current" value={formatPrice(change.currentPrice, change.currency)} />
          <Metric
            label="Price change"
            value={
              change.priceChange === undefined
                ? "—"
                : formatPrice(Math.abs(change.priceChange), change.currency)
            }
          />
          <Metric
            label="Percent"
            value={
              change.changePercentage === undefined || change.changePercentage === null
                ? "—"
                : `${change.changePercentage > 0 ? "+" : ""}${change.changePercentage.toFixed(1)}%`
            }
          />
        </dl>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-x-4 text-sm">
          <Metric label="Availability" value={availabilityLabel(change.availability)} />
          <Metric label="Detected change" value={change.detectedChange.replaceAll("_", " ").toLowerCase()} />
        </dl>
      )}
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600">{label}</dt>
      <dd className="mt-0.5 font-semibold text-slate-900">{value}</dd>
    </div>
  );
}
