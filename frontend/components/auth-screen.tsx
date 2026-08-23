import Link from "next/link";
import type { FormEvent, ReactNode } from "react";

export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
  onSubmit,
  submitting,
  submitLabel,
  error,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  submitLabel: string;
  error?: string | null;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,122,168,0.28),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(15,118,110,0.22),transparent_40%)]" />
        <div className="relative">
          <Link href="/login" className="inline-flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded bg-white text-[11px] font-semibold tracking-wide text-slate-950">
              ECT
            </span>
            <span>
              <span className="block text-sm font-semibold">Ecommerce Competitor Tracker</span>
              <span className="block text-xs text-slate-400">Market tracking</span>
            </span>
          </Link>
        </div>
        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">
            Competitor intelligence
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
            See price cuts, new products, and review shifts before they hit your store.
          </h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Track Shopify and Daraz competitors in one workspace. Capture prices,
            watch weekly changes, and get a Claude briefing from those stored facts.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-200">
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
              Daily, weekly, or monthly capture schedules
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
              Real store prices — never invented mock data
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
              Review themes from public customer feedback
            </li>
          </ul>
        </div>
        <p className="relative text-xs text-slate-500">
          Built for ecommerce teams who need a live view of the market.
        </p>
      </section>

      <section className="flex items-center justify-center bg-[var(--background)] px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded bg-slate-900 text-[11px] font-semibold tracking-wide text-white">
              ECT
            </span>
            <span className="text-sm font-semibold text-slate-900">Ecommerce Competitor Tracker</span>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>

          <form className="mt-8 space-y-4" onSubmit={onSubmit}>
            {children}
            {error ? (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
                {error}
              </p>
            ) : null}
            <button type="submit" className="button-primary w-full justify-center" disabled={submitting}>
              {submitting ? "Please wait…" : submitLabel}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-500">{footer}</p>
        </div>
      </section>
    </div>
  );
}
