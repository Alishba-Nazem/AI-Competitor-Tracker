import { formatCapturedFacts } from "@/lib/ai";
import type { IntelligenceDashboard } from "@/lib/types";

/**
 * Loads the signed-in user's captured intelligence pack from the existing Nest
 * API. This is the extension point for deeper retrieval (per-competitor
 * workspaces, snapshots) without changing the /api/chat stream contract.
 */
export async function loadCapturedChatContext(authorization: string | null) {
  if (!authorization) {
    return {
      authorized: false as const,
      factsText: formatCapturedFacts(null),
    };
  }

  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";

  try {
    const response = await fetch(`${base}/intelligence/dashboard`, {
      headers: { Authorization: authorization },
      cache: "no-store",
    });

    if (response.status === 401 || response.status === 403) {
      return {
        authorized: false as const,
        factsText: formatCapturedFacts(null),
      };
    }

    if (!response.ok) {
      return {
        authorized: true as const,
        factsText: formatCapturedFacts(null),
      };
    }

    const dashboard = (await response.json()) as IntelligenceDashboard;
    return {
      authorized: true as const,
      factsText: formatCapturedFacts(dashboard),
    };
  } catch {
    return {
      authorized: true as const,
      factsText: [
        "Captured competitor facts: the tracker API could not be reached.",
        "Tell the user you cannot read stored prices until the API is available.",
      ].join("\n"),
    };
  }
}
