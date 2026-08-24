"use client";

import Link from "next/link";
import type { IntelligenceFinding, IntelligenceFindingKind, MarketAnalysis } from "@/lib/types";
import { PriceRangeBar, RatingHistogram, SentimentChart, ThemeBars } from "@/components/charts";
import { EmptyState } from "@/components/ui";

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
    return <p className="px-4 py-6 text-sm text-stone-600" role="status">{emptyText}</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {findings.map((finding, index) => (
        <li key={`${finding.kind}-${finding.productId ?? finding.title}-${index}`} className="px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-block px-1.5 py-0.5 text-xs font-semibold ${labelClass(finding.kind)}`}>
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

/** Visual read of stored review ratings: how many customers liked or disliked what competitors sell. */
export function SentimentPanel({ market }: { market: MarketAnalysis }) {
  return (
    <div className="space-y-6">
      <SentimentChart sentiment={market.sentiment} />
      {market.sentiment.rated > 0 ? (
        <div className="grid gap-6 border-t border-slate-100 pt-5 md:grid-cols-3">
          <RatingHistogram distribution={market.sentiment.ratingDistribution} />
          <ThemeBars
            title="Praised most"
            items={market.likes}
            tone="positive"
            empty="No repeated praise in high-rated reviews yet."
          />
          <ThemeBars
            title="Complained about most"
            items={market.complaints}
            tone="negative"
            empty="No repeated complaint in low-rated reviews yet."
          />
        </div>
      ) : null}
    </div>
  );
}

export function MarketPanel({ market }: { market: MarketAnalysis }) {
  return (
    <div className="space-y-4">
      {market.priceBand ? (
        <PriceRangeBar band={market.priceBand} />
      ) : (
        <p className="text-sm text-stone-600">No captured selling prices yet. Run Capture in a workspace.</p>
      )}
      <p className="text-sm text-slate-600">
        {market.reviewCount} stored review{market.reviewCount === 1 ? "" : "s"} across {market.competitorCount}{" "}
        competitor{market.competitorCount === 1 ? "" : "s"}.
      </p>
      {!market.enoughData ? (
        <EmptyState title="Not enough review data" text={market.message ?? "Capture public reviews first."} />
      ) : (
        <div className="grid gap-6 border-t border-slate-100 pt-4 md:grid-cols-[minmax(0,18rem)_1fr]">
          <ThemeBars
            title="Repeated needs"
            items={market.repeatedNeeds}
            tone="accent"
            empty="No repeated themes yet."
          />
          {market.opportunities.length > 0 ? (
            <div className="space-y-3">
              {market.opportunities.map((item) => (
                <div key={item.title}>
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{item.detail}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-600">
              No repeated complaint pattern is strong enough to call a market gap yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
