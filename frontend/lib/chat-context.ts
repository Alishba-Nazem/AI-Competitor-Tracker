import { formatCapturedFacts } from "@/lib/ai";
import type { Competitor, IntelligenceDashboard } from "@/lib/types";

export function trackerApiBase() {
  return process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") || "http://localhost:3000";
}

export function toTrackerToolError(error: unknown) {
  if (error instanceof Error && /sign in/i.test(error.message)) return error;
  return new Error("Couldn't retrieve competitor data");
}

export async function fetchTrackerJson<T>(path: string, authorization: string): Promise<T> {
  const response = await fetch(`${trackerApiBase()}${path.startsWith("/") ? path : `/${path}`}`, {
    headers: { Authorization: authorization },
    cache: "no-store",
  });
  if (response.status === 401 || response.status === 403) {
    throw new Error("Sign in to ask about your captured competitor data.");
  }
  if (!response.ok) {
    throw new Error("Couldn't retrieve competitor data");
  }
  return (await response.json()) as T;
}

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

  try {
    const response = await fetch(`${trackerApiBase()}/intelligence/dashboard`, {
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
    let competitors: Competitor[] = [];
    try {
      competitors = await fetchTrackerJson<Competitor[]>("/competitors", authorization);
    } catch {
      competitors = [];
    }
    return {
      authorized: true as const,
      factsText: formatCapturedFacts(dashboard, competitors),
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
