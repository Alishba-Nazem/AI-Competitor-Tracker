"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "@/lib/api";
import { getAuthUserId, readOnboardingCompleted, writeOnboardingCompleted } from "@/lib/auth";
import { LoadingState } from "@/components/ui";

function ProtectedWorkspace({ children }: { children: ReactNode }) {
  const router = useRouter();
  // Always start false so SSR and the first client render match (sessionStorage
  // is unavailable on the server and would otherwise cause a hydration mismatch).
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const userId = getAuthUserId();

    if (readOnboardingCompleted(userId)) {
      setReady(true);
      void api
        .getOnboardingStatus()
        .then((status) => {
          if (!active) return;
          writeOnboardingCompleted(status.completed, userId);
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
        writeOnboardingCompleted(status.completed, userId);
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
