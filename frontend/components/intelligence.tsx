"use client";

import Link from "next/link";
import type { IntelligenceFinding, IntelligenceFindingKind, MarketAnalysis } from "@/lib/types";
import { EmptyState } from "@/components/ui";
import { formatPrice } from "@/lib/format";

const LABELS: Record<IntelligenceFindingKind, string> = {
  PRICE_DECREASE: "Price down",
  PRICE_INCREASE: "Price up",
  NEW_PRODUCT: "New product",
  CUSTOMER_LIKE: "Customers like",
  CUSTOMER_COMPLAINT: "Complaint",
  REPEATED_NEED: "Repeated need",
  MARKET_GAP: "Opportunity",
};

function labelClass(kind: IntelligenceFindingKind) {
  if (kind === "PRICE_DECREASE" || kind === "NEW_PRODUCT") return "text-emerald-800 bg-emerald-50";
  if (kind === "PRICE_INCREASE") return "text-rose-800 bg-rose-50";
  if (kind === "MARKET_GAP") return "text-slate-900 bg-slate-100";
  if (kind === "CUSTOMER_COMPLAINT") return "text-amber-800 bg-amber-50";
  return "text-slate-700 bg-slate-50";
}

export function FindingList({
  findings,
  emptyText,
}: {
  findings: IntelligenceFinding[];
  emptyText: string;
}) {
  if (findings.length === 0) {
    return <p className="px-4 py-6 text-sm text-slate-500">{emptyText}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {findings.map((finding, index) => (
        <li key={`${finding.kind}-${finding.productId ?? finding.title}-${index}`} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-block px-1.5 py-0.5 text-[11px] font-semibold ${labelClass(finding.kind)}`}>
              {LABELS[finding.kind]}
            </span>
            {finding.competitorId ? (
              <Link
                href={`/competitors/${finding.competitorId}`}
                className="text-sm font-semibold text-slate-900 hover:underline"
              >
                {finding.title}
              </Link>
            ) : (
              <p className="text-sm font-semibold text-slate-900">{finding.title}</p>
            )}
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-600">{finding.detail}</p>
        </li>
      ))}
    </ul>
  );
}

export function ThemeColumn({
  title,
  items,
  empty,
}: {
  title: string;
  items: Array<{ theme: string; count: number }>;
  empty: string;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="mt-2 space-y-1 text-sm text-slate-600">
          {items.map((item) => (
            <li key={item.theme} className="flex justify-between gap-4">
              <span className="capitalize">{item.theme}</span>
              <span className="tabular-nums text-slate-400">{item.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MarketPanel({ market }: { market: MarketAnalysis }) {
  return (
    <div className="space-y-4">
      {market.priceBand ? (
        <p className="text-sm text-slate-600">
          Captured competitor prices:{" "}
          <span className="font-semibold text-slate-900">
            {formatPrice(market.priceBand.min, market.priceBand.currency)} –{" "}
            {formatPrice(market.priceBand.max, market.priceBand.currency)}
          </span>{" "}
          ({market.priceBand.sampleSize} products)
        </p>
      ) : (
        <p className="text-sm text-slate-500">No captured selling prices yet. Run Capture in a workspace.</p>
      )}
      <p className="text-sm text-slate-600">
        {market.reviewCount} stored review{market.reviewCount === 1 ? "" : "s"} across {market.competitorCount}{" "}
        competitor{market.competitorCount === 1 ? "" : "s"}.
      </p>
      {!market.enoughData ? (
        <EmptyState title="Not enough review data" text={market.message ?? "Capture public reviews first."} />
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-3">
            <ThemeColumn title="Customers like" items={market.likes} empty="No positive themes yet." />
            <ThemeColumn title="Customers complain about" items={market.complaints} empty="No repeated complaints yet." />
            <ThemeColumn title="Repeated needs" items={market.repeatedNeeds} empty="No repeated themes yet." />
          </div>
          {market.opportunities.length > 0 ? (
            <div className="border-t border-slate-100 pt-4">
              {market.opportunities.map((item) => (
                <div key={item.title}>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No repeated complaint pattern is strong enough to call a market gap yet.
            </p>
          )}
        </>
      )}
    </div>
  );
}
