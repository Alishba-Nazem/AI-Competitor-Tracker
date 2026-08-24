import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DashboardClient } from "@/app/(workspace)/dashboard-client";

const pushToast = vi.fn();

vi.mock("@/components/toast", () => ({
  useToast: () => ({ pushToast }),
}));

vi.mock("@/components/forms", () => ({
  AddCompetitorModal: () => null,
}));

vi.mock("next/dynamic", () => ({
  default: (loader: () => Promise<unknown>) => {
    void loader;
    return () => null;
  },
}));

vi.mock("@/lib/api", () => ({
  api: {
    getIntelligenceDashboard: vi.fn(),
    getCompetitors: vi.fn(),
    getDashboardSummary: vi.fn(),
    getIntelligenceBriefing: vi.fn(),
  },
}));

import { api } from "@/lib/api";

describe("DashboardClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading, then captured dashboard data and an AI briefing", async () => {
    vi.mocked(api.getIntelligenceDashboard).mockResolvedValue({
      profile: {
        id: 1,
        businessName: "Ayan Bags",
        category: "Bags",
        country: "Pakistan",
        storeUrl: null,
        onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      summary: {
        competitorCount: 1,
        productCount: 12,
        capturedProductCount: 8,
        reviewCount: 40,
        findingCount: 0,
      },
      findings: [],
      market: {
        enoughData: true,
        reviewCount: 40,
        competitorCount: 1,
        capturedProductCount: 8,
        sentiment: {
          rated: 20,
          unrated: 20,
          positive: 12,
          neutral: 3,
          negative: 5,
          positivePercent: 60,
          negativePercent: 25,
          averageRating: 3.8,
          ratingDistribution: { "1": 2, "2": 3, "3": 3, "4": 5, "5": 7 },
        },
        likes: [{ theme: "design", count: 9 }],
        complaints: [{ theme: "straps", count: 5 }],
        repeatedNeeds: [{ theme: "quality", count: 11 }],
        opportunities: [],
        priceBand: null,
      },
    });
    vi.mocked(api.getCompetitors).mockResolvedValue([
      {
        id: 10,
        name: "Ayan mall",
        url: "https://ayanmall.example",
        isActive: true,
      },
    ] as never);
    vi.mocked(api.getDashboardSummary).mockResolvedValue({
      competitors: 1,
      products: 12,
      changesThisWeek: 3,
      reviews: 40,
    } as never);
    vi.mocked(api.getIntelligenceBriefing).mockResolvedValue({
      source: "gemini",
      available: true,
      headline: "Rivals cut bag prices this week",
      bullets: ["Ayan mall dropped a shoulder bag 10%."],
      risks: [],
      nextActions: ["Recheck your own listing price."],
    } as never);

    render(<DashboardClient />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading dashboard");

    expect(await screen.findByRole("heading", { name: "Ayan Bags" })).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Tracked competitors" })).toBeInTheDocument();
    expect(await screen.findByText("Gemini briefing")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ayan mall" })).toHaveAttribute("href", "/competitors/10");
  });

  it("charts stored review ratings as like and dislike shares", async () => {
    vi.mocked(api.getIntelligenceDashboard).mockResolvedValue({
      profile: null,
      summary: {
        competitorCount: 1,
        productCount: 12,
        capturedProductCount: 8,
        reviewCount: 40,
        findingCount: 0,
      },
      findings: [],
      market: {
        enoughData: true,
        reviewCount: 40,
        competitorCount: 1,
        capturedProductCount: 8,
        sentiment: {
          rated: 20,
          unrated: 20,
          positive: 12,
          neutral: 3,
          negative: 5,
          positivePercent: 60,
          negativePercent: 25,
          averageRating: 3.8,
          ratingDistribution: { "1": 2, "2": 3, "3": 3, "4": 5, "5": 7 },
        },
        likes: [{ theme: "design", count: 9 }],
        complaints: [{ theme: "straps", count: 5 }],
        repeatedNeeds: [{ theme: "quality", count: 11 }],
        opportunities: [],
        priceBand: null,
      },
    } as never);
    vi.mocked(api.getCompetitors).mockResolvedValue([] as never);
    vi.mocked(api.getDashboardSummary).mockResolvedValue(null as never);
    vi.mocked(api.getIntelligenceBriefing).mockResolvedValue({
      source: "fallback",
      available: false,
      headline: "",
      bullets: [],
      risks: [],
      nextActions: [],
    } as never);

    render(<DashboardClient />);

    expect(
      await screen.findByRole("heading", { name: "How customers rate competitors" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Liked/)).toBeInTheDocument();
    expect(screen.getByText("12 (60%)")).toBeInTheDocument();
    expect(screen.getByText("5 (25%)")).toBeInTheDocument();
    expect(screen.getByText(/20 rated reviews/)).toBeInTheDocument();
  });

  it("surfaces a dashboard load error without inventing competitor data", async () => {
    vi.mocked(api.getIntelligenceDashboard).mockRejectedValue(new Error("Failed to load dashboard."));
    vi.mocked(api.getCompetitors).mockRejectedValue(new Error("Failed to load dashboard."));
    vi.mocked(api.getDashboardSummary).mockRejectedValue(new Error("Failed to load dashboard."));
    vi.mocked(api.getIntelligenceBriefing).mockRejectedValue(new Error("Failed to load AI briefing."));

    render(<DashboardClient />);

    await waitFor(() => {
      expect(pushToast).toHaveBeenCalledWith("error", "Failed to load dashboard.");
    });
    expect(screen.queryByText("Ayan mall")).not.toBeInTheDocument();
  });
});
