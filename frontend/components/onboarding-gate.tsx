"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { LoadingState } from "@/components/ui";

const ONBOARDING_STATUS_KEY = "act_onboarding_completed";

function readCachedCompleted() {
  try {
    return sessionStorage.getItem(ONBOARDING_STATUS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCachedCompleted(completed: boolean) {
  try {
    if (completed) sessionStorage.setItem(ONBOARDING_STATUS_KEY, "1");
    else sessionStorage.removeItem(ONBOARDING_STATUS_KEY);
  } catch {
    // Ignore storage failures (private mode, etc.).
  }
}

function ProtectedWorkspace({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Always start false so SSR and the first client render match (sessionStorage
  // is unavailable on the server and would otherwise cause a hydration mismatch).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    if (readCachedCompleted()) {
      setReady(true);
      void api
        .getOnboardingStatus()
        .then((status) => {
          if (!active) return;
          writeCachedCompleted(status.completed);
          if (!status.completed) router.replace("/onboarding");
        })
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }

    void (async () => {
      try {
        const status = await api.getOnboardingStatus();
        if (!active) return;
        writeCachedCompleted(status.completed);
        if (!status.completed) {
          router.replace("/onboarding");
          return;
        }
      } catch {
        if (!active) return;
      } finally {
        if (active) setReady(true);
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) {
    return <LoadingState text="Loading workspace…" />;
  }

  return <>{children}</>;
}

export function OnboardingGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname.startsWith("/onboarding")) {
    return <>{children}</>;
  }

  return <ProtectedWorkspace>{children}</ProtectedWorkspace>;
}
