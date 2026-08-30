import Link from "next/link";
import type { ReactNode } from "react";

export function AuthScreen({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden bg-slate-950 px-10 py-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,122,168,0.28),transparent_42%),radial-gradient(circle_at_80%_80%,rgba(15,118,110,0.22),transparent_40%)]" />
        <header className="relative">
          <Link href="/login" className="inline-flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded bg-white text-[11px] font-semibold tracking-wide text-slate-950">
              ECT
            </span>
            <span>
              <span className="block text-sm font-semibold">Ecommerce Competitor Tracker</span>
              <span className="block text-xs text-slate-300">Market tracking</span>
            </span>
          </Link>
        </header>
        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-200">
            Competitor intelligence
          </p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-tight">
            See price cuts, new products, and review shifts before they hit your store.
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-200">
            Track Shopify and Daraz competitors in one workspace. Capture prices,
            watch weekly changes, and get a Claude briefing from those stored facts.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-slate-100">
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" aria-hidden="true" />
              Daily, weekly, or monthly capture schedules
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" aria-hidden="true" />
              Real store prices — never invented mock data
            </li>
            <li className="flex gap-3">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-300" aria-hidden="true" />
              Review themes from public customer feedback
            </li>
          </ul>
        </div>
        <footer className="relative text-xs text-slate-200">
          Built for ecommerce teams who need a live view of the market.
        </footer>
      </section>

      <div className="flex items-center justify-center bg-[var(--background)] px-4 py-10 sm:px-8">
        <div className="w-full max-w-[420px]">
          <header className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-8 w-8 place-items-center rounded bg-slate-900 text-[11px] font-semibold tracking-wide text-white">
              ECT
            </span>
            <span className="text-sm font-semibold text-slate-900">Ecommerce Competitor Tracker</span>
          </header>
          <main id="main-content">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-2 text-sm leading-6 text-stone-600">{subtitle}</p>
            {children}
          </main>
          <footer className="mt-6 text-sm text-stone-600">
            <nav aria-label="Account">{footer}</nav>
          </footer>
        </div>
      </div>
    </div>
  );
}
