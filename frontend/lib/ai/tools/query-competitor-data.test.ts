import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChangeDetectionResult, Competitor, Product } from "@/lib/types";

vi.mock("@/lib/chat-context", () => ({
  fetchTrackerJson: vi.fn(),
  toTrackerToolError: (error: unknown) =>
    error instanceof Error && /sign in/i.test(error.message)
      ? error
      : new Error("Couldn't retrieve competitor data"),
}));

import { fetchTrackerJson } from "@/lib/chat-context";
import { executeQueryCompetitorData } from "@/lib/ai/tools/query-competitor-data";

const fetchJson = vi.mocked(fetchTrackerJson);

const ayanMall: Competitor = {
  id: 10,
  name: "Ayan Mall",
  url: "https://ayan.example",
  isActive: true,
};

const tote: Product = {
  id: 44,
  competitorId: 10,
  name: "Tote Bag",
  url: "https://ayan.example/tote",
  currentPrice: 2050,
  currency: "PKR",
  availability: "IN_STOCK",
};

const sandal: Product = {
  id: 45,
  competitorId: 10,
  name: "Sandal",
  url: "https://ayan.example/sandal",
  currentPrice: 799,
  currency: "PKR",
};

const toteDrop: ChangeDetectionResult = {
  competitorId: 10,
  latestSnapshotId: 2,
  previousSnapshotId: 1,
  hasChanges: true,
  changes: [
    {
      type: "PRICE_DECREASE",
      productId: 44,
      productName: "Tote Bag",
      productUrl: "https://ayan.example/tote",
      previousPrice: 2400,
      currentPrice: 2050,
      currency: "PKR",
      priceDifference: -350,
      percentageChange: -14.6,
      currentAvailability: "IN_STOCK",
      previousAvailability: "IN_STOCK",
    },
  ],
};

const noChanges: ChangeDetectionResult = {
  competitorId: 10,
  latestSnapshotId: 2,
  previousSnapshotId: 1,
  hasChanges: false,
  changes: [],
};

function mockTracker(options: {
  competitors?: Competitor[];
  products?: Product[];
  changes?: ChangeDetectionResult;
}) {
  fetchJson.mockImplementation(async (path: string) => {
    if (path === "/competitors") return options.competitors ?? [ayanMall];
    if (path === "/products") return options.products ?? [tote, sandal];
    if (path === "/changes/competitor/10") return options.changes ?? noChanges;
    throw new Error(`unexpected ${path}`);
  });
}

describe("executeQueryCompetitorData", () => {
  beforeEach(() => {
    fetchJson.mockReset();
  });

  it("maps captured snapshot diffs into structured price-change rows", async () => {
    mockTracker({ changes: toteDrop, products: [tote] });

    const result = await executeQueryCompetitorData("Bearer test-token", {
      changeType: "PRICE_DECREASE",
    });

    expect(result.hasChanges).toBe(true);
    expect(result.status).toBe("changes");
    expect(result.changes).toEqual([
      expect.objectContaining({
        competitor: "Ayan Mall",
        product: "Tote Bag",
        previousPrice: 2400,
        currentPrice: 2050,
        priceChange: -350,
        changePercentage: -14.6,
        detectedChange: "PRICE_DECREASE",
        availability: "IN_STOCK",
      }),
    ]);
  });

  it("returns current prices when products exist and there are zero snapshot diffs", async () => {
    mockTracker({ products: [tote, sandal], changes: noChanges });

    const result = await executeQueryCompetitorData("Bearer test-token", {});

    expect(result.status).toBe("stable");
    expect(result.hasChanges).toBe(false);
    expect(result.productCount).toBe(2);
    expect(result.priceSummary).toEqual({
      min: 799,
      median: 1424.5,
      max: 2050,
      currency: "PKR",
      sampleSize: 2,
    });
    expect(result.message).toMatch(/2 captured competitor products/);
    expect(result.message).not.toMatch(/No matching competitor data found/);
    expect(result.products.map((item) => item.product)).toEqual(["Sandal", "Tote Bag"]);
  });

  it("returns a true empty-product state when a competitor has no catalog yet", async () => {
    mockTracker({ products: [], changes: noChanges });
    const result = await executeQueryCompetitorData("Bearer test-token", {});
    expect(result.status).toBe("no_products");
    expect(result.message).toMatch(/No competitor products have been captured yet/);
    expect(result.message).not.toMatch(/No matching competitor data found/);
  });

  it("returns an empty success payload when no competitors match", async () => {
    mockTracker({ competitors: [] });
    const result = await executeQueryCompetitorData("Bearer test-token", {
      competitorName: "Missing Store",
    });
    expect(result.hasChanges).toBe(false);
    expect(result.status).toBe("no_match");
    expect(result.changes).toEqual([]);
    expect(result.message).toMatch(/No tracked competitor/);
  });

  it("says no competitors are tracked when the workspace is empty", async () => {
    mockTracker({ competitors: [], products: [] });
    const result = await executeQueryCompetitorData("Bearer test-token", {});
    expect(result.status).toBe("no_competitors");
    expect(result.message).toBe("No competitors are currently being tracked.");
  });

  it("throws a user-safe error when the tracker API fails", async () => {
    fetchJson.mockRejectedValueOnce(new Error("Failed to fetch"));
    await expect(executeQueryCompetitorData("Bearer test-token", {})).rejects.toThrow(
      "Couldn't retrieve competitor data",
    );
  });

  it("returns an empty success payload when sabotage empty is set", async () => {
    const result = await executeQueryCompetitorData("Bearer test-token", {}, "empty");
    expect(result.hasChanges).toBe(false);
    expect(result.status).toBe("no_match");
    expect(result.changes).toEqual([]);
    expect(result.message).toMatch(/No matching competitor data found/);
  });

  it("throws when sabotage tool is set", async () => {
    await expect(executeQueryCompetitorData("Bearer test-token", {}, "tool")).rejects.toThrow(
      "Couldn't retrieve competitor data",
    );
  });
});
