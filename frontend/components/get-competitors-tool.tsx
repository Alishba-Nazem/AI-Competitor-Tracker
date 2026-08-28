"use client";

import type { UIToolInvocation } from "ai";
import type { ChatTools } from "@/lib/ai/chat-tools";

type Invocation = UIToolInvocation<ChatTools["getCompetitors"]>;

export function GetCompetitorsToolPart({
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
        <p className="text-sm font-semibold text-[#163e62]">Looking up tracked competitors…</p>
      ) : null}
      {part.state === "output-available" ? (
        <div>
          <p className="text-sm font-semibold text-slate-900">{part.output.message}</p>
          {part.output.competitors.length > 0 ? (
            <ul className="mt-2 space-y-2">
              {part.output.competitors.map((competitor) => (
                <li key={competitor.id} className="rounded border border-slate-200 bg-slate-50 px-2.5 py-2 text-sm">
                  <p className="font-semibold text-slate-900">{competitor.name}</p>
                  <p className="mt-0.5 break-all text-xs text-stone-600">{competitor.url}</p>
                  <p className="mt-1 text-xs text-stone-600">
                    {competitor.productCount} product{competitor.productCount === 1 ? "" : "s"}
                    {competitor.platform ? ` · ${competitor.platform}` : ""}
                    {competitor.isActive ? "" : " · inactive"}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
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
