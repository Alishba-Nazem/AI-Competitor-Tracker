"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AiChat } from "@/components/ai-chat";
import { PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { CHAT_TEST_ERROR_QUERY } from "@/lib/ai/chat-test-error";
import type { IntelligenceDashboard } from "@/lib/types";

export function AssistantClient() {
  return (
    <Suspense fallback={<AssistantShell dashboard={null} testErrorQuery={null} />}>
      <AssistantClientInner />
    </Suspense>
  );
}

function AssistantClientInner() {
  const params = useSearchParams();
  const testErrorQuery = params.get(CHAT_TEST_ERROR_QUERY);
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

  return <AssistantShell dashboard={dashboard} testErrorQuery={testErrorQuery} />;
}

function AssistantShell({
  dashboard,
  testErrorQuery,
}: {
  dashboard: IntelligenceDashboard | null;
  testErrorQuery: string | null;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col" style={{ height: "max(22rem, calc(100dvh - 8.75rem))" }}>
      <PageHeader
        title="AI Competitor Analyst"
        subtitle="Gemini answers from your stored competitor prices, catalog changes, and reviews — never invented numbers."
      />
      <AiChat dashboard={dashboard} testErrorQuery={testErrorQuery} className="min-h-0 min-w-0 flex-1" />
    </div>
  );
}
