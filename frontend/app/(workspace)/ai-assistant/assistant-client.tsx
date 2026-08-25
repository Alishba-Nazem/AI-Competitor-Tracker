"use client";

import { useCallback, useEffect, useState } from "react";
import { AiChat } from "@/components/ai-chat";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import type { IntelligenceDashboard } from "@/lib/types";

export function AssistantClient() {
  const [dashboard, setDashboard] = useState<IntelligenceDashboard | null>(null);

  const load = useCallback(async () => {
    try {
      setDashboard(await api.getIntelligenceDashboard());
    } catch {
      setDashboard(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  return (
    <div className="flex h-[max(28rem,calc(100dvh-10rem))] min-h-[28rem] flex-col">
      <PageHeader
        title="AI Competitor Analyst"
        subtitle="Gemini answers from your stored competitor prices, catalog changes, and reviews — never invented numbers."
      />
      <AiChat dashboard={dashboard} className="min-h-0 flex-1" />
    </div>
  );
}
