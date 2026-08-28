"use client";

import type { UIToolInvocation } from "ai";
import { CompetitorPriceChangeCard } from "@/components/competitor-price-change-card";
import type { ChatTools } from "@/lib/ai/chat-tools";
import type { QueryCompetitorDataInput } from "@/lib/ai/tools/query-competitor-data";

type QueryInvocation = UIToolInvocation<ChatTools["queryCompetitorData"]>;

export function QueryCompetitorDataToolPart({
  part,
  onRetry,
  retryDisabled = false,
  retrying = false,
}: {
  part: QueryInvocation;
  onRetry?: () => void;
  retryDisabled?: boolean;
  retrying?: boolean;
}) {
  return (
    <section
      className={`mt-2 overflow-hidden rounded border px-3 py-3 transition-[background-color,border-color,box-shadow,opacity] duration-200 ${frameClass(part.state)}`}
      aria-live="polite"
    >
      {part.state === "input-streaming" ? <InputStreaming /> : null}
      {part.state === "input-available" ? <InputAvailable input={part.input} /> : null}
      {part.state === "output-available" ? <CompetitorPriceChangeCard result={part.output} /> : null}
      {part.state === "output-error" ? (
        <OutputError
          errorText={part.errorText}
          onRetry={onRetry}
          retryDisabled={retryDisabled || retrying}
          retrying={retrying}
        />
      ) : null}
    </section>
  );
}

function frameClass(state: QueryInvocation["state"]) {
  if (state === "input-streaming") {
    return "border-dashed border-slate-300 bg-slate-50";
  }
  if (state === "input-available") {
    return "border-solid border-slate-300 border-l-4 border-l-[#163e62] bg-white";
  }
  if (state === "output-error") {
    return "border-solid border-rose-200 border-l-4 border-l-rose-700 bg-rose-50";
  }
  return "border-solid border-slate-200 bg-white shadow-sm";
}

function InputStreaming() {
  return (
    <div role="status">
      <p className="text-sm font-semibold text-slate-800">Preparing competitor data query…</p>
      <p className="mt-1 text-xs leading-5 text-stone-600">
        The AI is deciding what information to request from captured snapshots.
      </p>
      <div className="mt-3 space-y-2" aria-hidden="true">
        <div className="h-2 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="h-2 w-1/2 animate-pulse rounded bg-slate-200" />
      </div>
    </div>
  );
}

function InputAvailable({ input }: { input: QueryCompetitorDataInput }) {
  const rows = [
    ["Tool", "Competitor Data"],
    ["Competitor", input.competitorName || "All tracked competitors"],
    ["Product", input.productName || "All captured products"],
    ["Change type", (input.changeType || "ALL").replaceAll("_", " ")],
  ];
  return (
    <div>
      <p className="text-sm font-semibold text-[#163e62]">Calling competitor data tool</p>
      <p className="mt-1 text-xs text-stone-600">What the AI is asking the tracker to look up.</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded bg-slate-50 px-2.5 py-2">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-stone-600">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-slate-900">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function OutputError({
  errorText,
  onRetry,
  retryDisabled,
  retrying,
}: {
  errorText: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
  retrying?: boolean;
}) {
  return (
    <div role="alert">
      <p className="text-sm font-semibold text-rose-900">Couldn&apos;t retrieve competitor data</p>
      <p className="mt-1 text-sm leading-6 text-rose-800">
        Something went wrong while querying the competitor data. The chat is still available.
      </p>
      <p className="sr-only">{sanitizeError(errorText)}</p>
      {onRetry ? (
        <button
          type="button"
          className="button-secondary mt-3 !border-rose-200 !bg-white !text-rose-900"
          onClick={onRetry}
          disabled={retryDisabled}
        >
          {retrying ? "Retrying..." : "Retry"}
        </button>
      ) : null}
    </div>
  );
}

function sanitizeError(text: string) {
  if (!text.trim()) return "Couldn't retrieve competitor data";
  if (/stack|at\s+\S+\s+\(/i.test(text) || text.length > 180) {
    return "Couldn't retrieve competitor data";
  }
  return text;
}
