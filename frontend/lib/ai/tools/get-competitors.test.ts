import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Competitor, Product } from "@/lib/types";

vi.mock("@/lib/chat-context", () => ({
  fetchTrackerJson: vi.fn(),
  toTrackerToolError: (error: unknown) =>
    error instanceof Error && /sign in/i.test(error.message)
      ? error
      : new Error("Couldn't retrieve competitor data"),
}));

import { fetchTrackerJson } from "@/lib/chat-context";
import { executeGetCompetitors } from "@/lib/ai/tools/get-competitors";

const fetchJson = vi.mocked(fetchTrackerJson);

const abcShoes: Competitor = {
  id: 7,
  name: "ABC Shoes",
  url: "https://abcshoes.example",
  isActive: true,
  platform: "SHOPIFY",
  lastCapturedAt: "2026-08-27T00:00:00.000Z",
};

describe("executeGetCompetitors", () => {
  beforeEach(() => {
    fetchJson.mockReset();
  });

  it("returns the stored competitor name, URL, and product count", async () => {
    fetchJson.mockImplementation(async (path: string) => {
      if (path === "/competitors") return [abcShoes];
      if (path === "/products") {
        return Array.from({ length: 12 }, (_, index) => ({
          id: index + 1,
          competitorId: 7,
          name: `Shoe ${index + 1}`,
          url: `https://abcshoes.example/${index + 1}`,
          currentPrice: 899,
          currency: "PKR",
        })) satisfies Product[];
      }
      throw new Error(`unexpected ${path}`);
    });

    const result = await executeGetCompetitors("Bearer test-token", {});
    expect(result.competitorCount).toBe(1);
    expect(result.productCount).toBe(12);
    expect(result.competitors[0]).toEqual(
      expect.objectContaining({
        id: 7,
        name: "ABC Shoes",
        url: "https://abcshoes.example",
        platform: "SHOPIFY",
        productCount: 12,
      }),
    );
    expect(result.message).toBe("You're currently tracking ABC Shoes.");
  });

  it("says no competitors are tracked when the list is empty", async () => {
    fetchJson.mockImplementation(async (path: string) => {
      if (path === "/competitors") return [];
      if (path === "/products") return [];
      throw new Error(`unexpected ${path}`);
    });
    const result = await executeGetCompetitors("Bearer test-token", {});
    expect(result.competitorCount).toBe(0);
    expect(result.message).toBe("No competitors are currently being tracked.");
  });
});
