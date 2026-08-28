import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Competitor, DashboardSummary, IntelligenceDashboard } from "@/lib/types";

vi.mock("@/lib/chat-context", () => ({
  fetchTrackerJson: vi.fn(),
  toTrackerToolError: (error: unknown) =>
    error instanceof Error && /sign in/i.test(error.message)
      ? error
      : new Error("Couldn't retrieve competitor data"),
}));

import { fetchTrackerJson } from "@/lib/chat-context";
import { executeGetDashboardSummary } from "@/lib/ai/tools/get-dashboard-summary";

const fetchJson = vi.mocked(fetchTrackerJson);

const dashboard: IntelligenceDashboard = {
  profile: {
    id: 1,
    businessName: "Ayan Bags",
    category: "Women bags",
    country: "Pakistan",
    storeUrl: null,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  summary: {
    competitorCount: 1,
    productCount: 12,
    capturedProductCount: 12,
    reviewCount: 0,
    findingCount: 0,
  },
  findings: [],
  market: {
    enoughData: true,
    reviewCount: 0,
    competitorCount: 1,
    capturedProductCount: 12,
    priceBand: { min: 799, max: 1700, median: 899, currency: "PKR", sampleSize: 12 },
    sentiment: {
      rated: 0,
      unrated: 0,
      positive: 0,
      neutral: 0,
      negative: 0,
      positivePercent: null,
      negativePercent: null,
      averageRating: null,
      ratingDistribution: {},
    },
    likes: [],
    complaints: [],
    repeatedNeeds: [],
    opportunities: [],
  },
};

describe("executeGetDashboardSummary", () => {
  beforeEach(() => {
    fetchJson.mockReset();
  });

  it("summarizes real dashboard totals including a stable catalog with zero price changes", async () => {
    fetchJson.mockImplementation(async (path: string) => {
      if (path === "/intelligence/dashboard") return dashboard;
      if (path === "/dashboard/summary") {
        return { competitors: 1, products: 12, changesThisWeek: 0, reviews: 0 } satisfies DashboardSummary;
      }
      if (path === "/competitors") {
        return [{ id: 7, name: "ABC Shoes", url: "https://abcshoes.example", isActive: true }] satisfies Competitor[];
      }
      throw new Error(`unexpected ${path}`);
    });

    const result = await executeGetDashboardSummary("Bearer test-token");
    expect(result.competitorCount).toBe(1);
    expect(result.productCount).toBe(12);
    expect(result.priceChangeCount).toBe(0);
    expect(result.newProductCount).toBe(0);
    expect(result.competitorNames).toEqual(["ABC Shoes"]);
    expect(result.message).toMatch(/ABC Shoes/);
    expect(result.message).toMatch(/12 captured products/);
    expect(result.message).toMatch(/No price changes/);
    expect(result.message).not.toMatch(/No matching competitor data found/);
  });
});
