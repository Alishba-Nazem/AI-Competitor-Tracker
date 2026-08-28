import { tool } from "ai";
import { z } from "zod";
import type { ChatTestErrorKind } from "@/lib/ai/chat-test-error";
import { fetchTrackerJson, toTrackerToolError } from "@/lib/chat-context";
import type { Competitor, DashboardSummary, IntelligenceDashboard } from "@/lib/types";

export const GET_DASHBOARD_SUMMARY_TOOL_NAME = "getDashboardSummary";

export const getDashboardSummaryInputSchema = z.object({});

export type GetDashboardSummaryInput = z.infer<typeof getDashboardSummaryInputSchema>;

export type DashboardSummaryOutput = {
  queriedAt: string;
  competitorCount: number;
  productCount: number;
  capturedProductCount: number;
  reviewCount: number;
  findingCount: number;
  priceChangeCount: number;
  newProductCount: number;
  changesThisWeek: number | null;
  category: string | null;
  market: string | null;
  priceBand: {
    min: number;
    median: number;
    max: number;
    currency: string;
    sampleSize: number;
  } | null;
  competitorNames: string[];
  message: string;
};

export function createGetDashboardSummaryTool(
  authorization: string,
  testError?: ChatTestErrorKind | null,
) {
  return tool({
    description:
      "Read the current dashboard totals: tracked competitors, captured products, price changes, new catalog items, reviews, and the observed price band. Use this for overviews and count questions. Do not invent metrics.",
    inputSchema: getDashboardSummaryInputSchema,
    execute: async () => executeGetDashboardSummary(authorization, testError),
  });
}

export async function executeGetDashboardSummary(
  authorization: string,
  testError?: ChatTestErrorKind | null,
): Promise<DashboardSummaryOutput> {
  if (testError === "tool") {
    throw new Error("Couldn't retrieve competitor data");
  }
  if (!authorization.trim()) {
    throw new Error("Couldn't retrieve competitor data");
  }

  let dashboard: IntelligenceDashboard;
  try {
    dashboard = await fetchTrackerJson<IntelligenceDashboard>("/intelligence/dashboard", authorization);
  } catch (error) {
    throw toTrackerToolError(error);
  }

  const [counts, names] = await Promise.all([
    loadWeeklyCounts(authorization),
    loadCompetitorNames(authorization),
  ]);

  const priceChangeCount = dashboard.findings.filter(
    (finding) => finding.kind === "PRICE_INCREASE" || finding.kind === "PRICE_DECREASE",
  ).length;
  const newProductCount = dashboard.findings.filter((finding) => finding.kind === "NEW_PRODUCT").length;
  const competitorCount = dashboard.summary.competitorCount;
  const productCount = dashboard.summary.productCount;
  const message = overviewMessage({
    competitorCount,
    productCount,
    priceChangeCount,
    newProductCount,
    names,
  });

  return {
    queriedAt: new Date().toISOString(),
    competitorCount,
    productCount,
    capturedProductCount: dashboard.summary.capturedProductCount,
    reviewCount: dashboard.summary.reviewCount,
    findingCount: dashboard.summary.findingCount,
    priceChangeCount,
    newProductCount,
    changesThisWeek: counts,
    category: dashboard.profile?.category ?? null,
    market: dashboard.profile?.country ?? null,
    priceBand: dashboard.market.priceBand,
    competitorNames: names,
    message,
  };
}

function overviewMessage({
  competitorCount,
  productCount,
  priceChangeCount,
  newProductCount,
  names,
}: {
  competitorCount: number;
  productCount: number;
  priceChangeCount: number;
  newProductCount: number;
  names: string[];
}) {
  if (competitorCount === 0) return "No competitors are currently being tracked.";
  const who = names.length === 1 ? names[0] : `${competitorCount} competitor${competitorCount === 1 ? "" : "s"}`;
  if (productCount === 0) {
    return `You're currently tracking ${who}, but no competitor products have been captured yet.`;
  }
  const changes =
    priceChangeCount === 0 && newProductCount === 0
      ? "No price changes or new catalog changes were detected in the latest comparison."
      : `${priceChangeCount} price change${priceChangeCount === 1 ? "" : "s"} and ${newProductCount} new product${newProductCount === 1 ? "" : "s"} were detected in the latest comparison.`;
  return `You're currently tracking ${who} with ${productCount} captured product${productCount === 1 ? "" : "s"}. ${changes}`;
}

async function loadWeeklyCounts(authorization: string) {
  try {
    const summary = await fetchTrackerJson<DashboardSummary>("/dashboard/summary", authorization);
    return summary.changesThisWeek;
  } catch {
    return null;
  }
}

async function loadCompetitorNames(authorization: string) {
  try {
    const competitors = await fetchTrackerJson<Competitor[]>("/competitors", authorization);
    return competitors.map((competitor) => competitor.name);
  } catch {
    return [];
  }
}
