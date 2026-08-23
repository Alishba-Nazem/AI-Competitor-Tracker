"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LoadingState } from "@/components/ui";
import { api } from "@/lib/api";
import { clearAuthToken, getAuthToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/signup"];

export function AuthGate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
      setReady(true);
      return;
    }

    let active = true;
    const token = getAuthToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    void api
      .getCurrentUser()
      .then(() => {
        if (active) setReady(true);
      })
      .catch(() => {
        clearAuthToken();
        if (active) router.replace("/login");
      });

    return () => {
      active = false;
    };
  }, [pathname, router]);

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return <>{children}</>;
  }

  if (!ready) {
    return <LoadingState text="Checking your session…" />;
  }

  return <>{children}</>;
}
