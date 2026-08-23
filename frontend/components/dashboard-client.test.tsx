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
        enoughData: false,
        reviewCount: 0,
        competitorCount: 1,
        capturedProductCount: 8,
        likes: [],
        complaints: [],
        repeatedNeeds: [],
        opportunities: [],
        priceBand: null,
        message: "Capture public reviews first.",
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
