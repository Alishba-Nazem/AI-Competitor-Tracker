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
      <p className="text-sm font-semibold leading-6 text-slate-900">{briefing.headline}</p>
      {briefing.bullets.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
          {briefing.bullets.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {briefing.risks.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-700">
            Risks
          </h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
            {briefing.risks.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
      {briefing.nextActions.length > 0 ? (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-700">
            Next actions
          </h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm leading-6 text-slate-600">
            {briefing.nextActions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
