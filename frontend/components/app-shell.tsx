"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { AuthGate } from "@/components/auth-gate";
import { OnboardingGate } from "@/components/onboarding-gate";
import type { NavKey } from "@/lib/types";

const NAV_ITEMS: Array<{ key: NavKey; href: string; label: string; icon: string }> = [
  { key: "dashboard", href: "/", label: "Research", icon: "overview" },
  { key: "competitors", href: "/competitors", label: "Competitors", icon: "competitors" },
  { key: "changes", href: "/changes", label: "Changes", icon: "changes" },
];

function activeKey(pathname: string): NavKey {
  if (pathname.startsWith("/competitors")) return "competitors";
  if (pathname.startsWith("/changes")) return "changes";
  return "dashboard";
}

function NavIcon({ name }: { name: string }) {
  const common = {
    width: 16,
    height: 16,
    viewBox: "0 0 16 16",
    fill: "none",
    "aria-hidden": true as const,
  };

  switch (name) {
    case "overview":
      return (
        <svg {...common}>
          <rect x="1.5" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
          <rect x="9" y="1.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
          <rect x="1.5" y="9" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
          <rect x="9" y="9" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case "competitors":
      return (
        <svg {...common}>
          <circle cx="6" cy="5" r="2.2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M2.5 13c.4-2.2 1.9-3.4 3.5-3.4S9.1 10.8 9.5 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          <circle cx="11" cy="5.5" r="1.7" stroke="currentColor" strokeWidth="1.4" />
          <path d="M10.2 13c.3-1.5 1.3-2.4 2.5-2.4 1.3 0 2.2.9 2.3 2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    case "products":
      return (
        <svg {...common}>
          <path d="M2.5 5.2 8 2.5l5.5 2.7v6.3L8 13.5 2.5 11.5V5.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M8 2.5v11" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case "changes":
      return (
        <svg {...common}>
          <path d="M3 11.5 6.5 8 8.8 10.2 13 5.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 5.5h3v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "reviews":
      return (
        <svg {...common}>
          <path d="M3 3.5h10v7.2H7.2L4 13V10.7H3V3.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        </svg>
      );
    case "snapshots":
      return (
        <svg {...common}>
          <rect x="2.5" y="3" width="11" height="10" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5 6.5h6M5 9.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
          <path
            d="M8 2.5v1.6M8 11.9v1.6M2.5 8h1.6M11.9 8h1.6M4.1 4.1l1.1 1.1M10.8 10.8l1.1 1.1M11.9 4.1l-1.1 1.1M5.2 10.8l-1.1 1.1"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
      );
  }
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuth = pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isOnboarding = pathname.startsWith("/onboarding");
  const current = activeKey(pathname);
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isAuth) {
    return (
      <AuthGate>
        <main id="main-content">{children}</main>
      </AuthGate>
    );
  }

  if (isOnboarding) {
    return (
      <div className="min-h-screen bg-[var(--background)] text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex h-14 max-w-2xl items-center gap-2.5 px-4 sm:px-6">
            <div className="grid h-8 w-8 place-items-center rounded bg-slate-900 text-[11px] font-semibold tracking-wide text-white">
              ECT
            </div>
            <div className="min-w-0">
              <div className="truncate text-[13px] font-semibold text-slate-900">Ecommerce Competitor Tracker</div>
              <div className="text-[11px] text-slate-500">Account setup</div>
            </div>
          </div>
        </header>
        <main id="main-content" className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
          <AuthGate>
            <OnboardingGate>{children}</OnboardingGate>
          </AuthGate>
        </main>
      </div>
    );
  }

  const nav = (
    <>
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-200 px-4">
        <div className="grid h-8 w-8 place-items-center rounded bg-slate-900 text-[11px] font-semibold tracking-wide text-white">
          ECT
        </div>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-semibold text-slate-900">Ecommerce Competitor Tracker</div>
          <div className="text-[11px] text-slate-500">Market tracking</div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col justify-between px-2 py-3" aria-label="Primary">
        <div className="space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`nav-link ${current === item.key ? "nav-link-active" : ""}`}
            >
              <NavIcon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </div>
        <Link
          href="/settings"
          onClick={() => setMobileOpen(false)}
          className="nav-link mt-4 text-[12px] text-slate-500"
        >
          Settings & account
        </Link>
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-[var(--background)] text-slate-900">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 flex-col border-r border-slate-200 bg-white lg:flex">
        {nav}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/25 lg:hidden" onClick={() => setMobileOpen(false)}>
          <aside
            className="flex h-full w-64 flex-col border-r border-slate-200 bg-white"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
          >
            {nav}
          </aside>
        </div>
      )}
      <div className="lg:pl-56">
        <header className="sticky top-0 z-30 flex h-12 items-center border-b border-slate-200 bg-[var(--background)] px-4 lg:hidden">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded text-slate-600 hover:bg-white"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M3 5h12M3 9h12M3 13h12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <p className="ml-2 text-sm font-semibold text-slate-800">Ecommerce Competitor Tracker</p>
        </header>
        <main id="main-content" className="mx-auto max-w-[1280px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
          <AuthGate>
            <OnboardingGate>{children}</OnboardingGate>
          </AuthGate>
        </main>
      </div>
    </div>
  );
}
