import type { IntelligenceBriefing } from "@/lib/types";

export function BriefingPanel({
  briefing,
  loading,
  error,
}: {
  briefing: IntelligenceBriefing | null;
  loading: boolean;
  error: string | null;
}) {
  if (loading) {
    return (
      <div
        className="px-4 py-6 text-sm text-stone-600"
        aria-busy="true"
        aria-live="polite"
      >
        Writing briefing from captured prices, changes, and reviews…
      </div>
    );
  }

  if (error) {
    return (
      <p className="px-4 py-6 text-sm text-rose-700" role="alert">
        {error}
      </p>
    );
  }

  if (!briefing || !briefing.available) {
    return (
      <p className="px-4 py-6 text-sm text-stone-600" role="status">
        {briefing?.message ||
          "Capture competitor prices and reviews first. The briefing only uses stored data."}
      </p>
    );
  }

  return (
    <div className="space-y-4 px-4 py-4" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-block px-1.5 py-0.5 text-xs font-semibold ${
            briefing.source === "fallback"
              ? "bg-slate-100 text-slate-700"
              : "bg-teal-50 text-teal-800"
          }`}
        >
          {briefing.source === "gemini"
            ? "Gemini briefing"
            : briefing.source === "claude"
              ? "Claude briefing"
              : "Captured-data briefing"}
        </span>
        {briefing.message ? (
          <span className="text-xs text-stone-600">{briefing.message}</span>
        ) : null}
      </div>
      <p className="border-l-4 border-[#1d4f7c] bg-slate-50 py-3 pl-3 pr-2 text-base font-semibold leading-6 text-slate-900">
        {briefing.headline}
      </p>
      {briefing.bullets.length > 0 ? (
        <ul className="space-y-2">
          {briefing.bullets.map((item) => (
            <li key={item} className="flex gap-2.5 text-sm leading-6 text-slate-700">
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#1d4f7c]"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      ) : null}
      {briefing.risks.length > 0 || briefing.nextActions.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          <BriefingCard
            title="Risks"
            items={briefing.risks}
            className="border-rose-200 bg-rose-50"
            titleClass="text-rose-800"
          />
          <BriefingCard
            title="Next actions"
            items={briefing.nextActions}
            className="border-emerald-200 bg-emerald-50"
            titleClass="text-emerald-800"
          />
        </div>
      ) : null}
    </div>
  );
}

function BriefingCard({
  title,
  items,
  className,
  titleClass,
}: {
  title: string;
  items: string[];
  className: string;
  titleClass: string;
}) {
  if (items.length === 0) return null;

  return (
    <div className={`border p-3 ${className}`}>
      <h3 className={`text-xs font-semibold uppercase tracking-[0.14em] ${titleClass}`}>
        {title}
      </h3>
      <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-800">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
