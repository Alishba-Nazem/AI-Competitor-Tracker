"use client";

import type { UIToolInvocation } from "ai";
import type { ChatTools } from "@/lib/ai/chat-tools";
import { formatPrice } from "@/lib/format";

type Invocation = UIToolInvocation<ChatTools["getDashboardSummary"]>;

export function DashboardSummaryToolPart({
  part,
  onRetry,
  retryDisabled = false,
  retrying = false,
}: {
  part: Invocation;
  onRetry?: () => void;
  retryDisabled?: boolean;
  retrying?: boolean;
}) {
  return (
    <section
      className={`mt-2 overflow-hidden rounded border px-3 py-3 ${
        part.state === "output-error"
          ? "border-rose-200 border-l-4 border-l-rose-700 bg-rose-50"
          : "border-slate-200 bg-white"
      }`}
      aria-live="polite"
    >
      {part.state === "input-streaming" || part.state === "input-available" ? (
        <p className="text-sm font-semibold text-[#163e62]">Reading dashboard totals…</p>
      ) : null}
      {part.state === "output-available" ? <SummaryBody output={part.output} /> : null}
      {part.state === "output-error" ? (
        <div role="alert">
          <p className="text-sm font-semibold text-rose-900">Couldn&apos;t retrieve competitor data</p>
          {onRetry ? (
            <button
              type="button"
              className="button-secondary mt-3 !border-rose-200 !bg-white !text-rose-900"
              onClick={onRetry}
              disabled={retryDisabled || retrying}
            >
              {retrying ? "Retrying..." : "Retry"}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function SummaryBody({ output }: { output: ChatTools["getDashboardSummary"]["output"] }) {
  const rows = [
    ["Competitors", String(output.competitorCount)],
    ["Products", String(output.productCount)],
    ["Price changes", String(output.priceChangeCount)],
    ["New products", String(output.newProductCount)],
  ];
  return (
    <div>
      <p className="text-sm font-semibold text-slate-900">{output.message}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded bg-slate-50 px-2.5 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600">{label}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
      {output.priceBand ? (
        <p className="mt-3 text-sm text-stone-600">
          Captured price range: {formatPrice(output.priceBand.min, output.priceBand.currency)} –{" "}
          {formatPrice(output.priceBand.max, output.priceBand.currency)} (median{" "}
          {formatPrice(output.priceBand.median, output.priceBand.currency)})
        </p>
      ) : null}
    </div>
  );
}
