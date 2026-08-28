import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CompetitorPriceChangeCard } from "@/components/competitor-price-change-card";
import type { QueryCompetitorDataOutput } from "@/lib/ai/tools/query-competitor-data";

const success: QueryCompetitorDataOutput = {
  queriedAt: "2026-08-25T00:00:00.000Z",
  status: "changes",
  competitorCount: 1,
  productCount: 1,
  changeCount: 1,
  hasChanges: true,
  message: "Found 1 captured change.",
  priceSummary: { min: 2050, median: 2050, max: 2050, currency: "PKR", sampleSize: 1 },
  products: [],
  changes: [
    {
      competitorId: 10,
      competitor: "Ayan Mall",
      productId: 44,
      product: "Tote Bag",
      productUrl: "https://ayan.example/tote",
      detectedChange: "PRICE_DECREASE",
      previousPrice: 2400,
      currentPrice: 2050,
      priceChange: -350,
      changePercentage: -14.6,
      currency: "PKR",
      availability: "IN_STOCK",
    },
  ],
};

describe("CompetitorPriceChangeCard", () => {
  it("renders captured prices instead of raw JSON", () => {
    render(<CompetitorPriceChangeCard result={success} />);
    expect(screen.getByText("Tote Bag")).toBeInTheDocument();
    expect(screen.getByText("Ayan Mall")).toBeInTheDocument();
    expect(screen.getByText("PKR 2,400")).toBeInTheDocument();
    expect(screen.getByText("PKR 2,050")).toBeInTheDocument();
    expect(screen.queryByText(/previousPrice/)).not.toBeInTheDocument();
  });

  it("shows a stable catalog instead of no-matching-data when products exist", () => {
    render(
      <CompetitorPriceChangeCard
        result={{
          queriedAt: "2026-08-25T00:00:00.000Z",
          status: "stable",
          competitorCount: 1,
          productCount: 12,
          changeCount: 0,
          hasChanges: false,
          message: "I found 12 captured competitor products, but no price changes were detected in the latest snapshot comparison.",
          priceSummary: { min: 799, median: 899, max: 1700, currency: "PKR", sampleSize: 12 },
          products: [
            {
              competitorId: 7,
              competitor: "ABC Shoes",
              productId: 1,
              product: "Runner",
              productUrl: "https://abcshoes.example/runner",
              currentPrice: 799,
              currency: "PKR",
            },
          ],
          changes: [],
        }}
      />,
    );
    expect(screen.getByText("No price changes detected")).toBeInTheDocument();
    expect(screen.queryByText("No matching competitor data found.")).not.toBeInTheDocument();
    expect(screen.getAllByText("PKR 799").length).toBeGreaterThan(0);
    expect(screen.getByText("Runner")).toBeInTheDocument();
  });

  it("shows a true empty-data state when no products were captured", () => {
    render(
      <CompetitorPriceChangeCard
        result={{
          queriedAt: "2026-08-25T00:00:00.000Z",
          status: "no_products",
          competitorCount: 1,
          productCount: 0,
          changeCount: 0,
          hasChanges: false,
          message: "No competitor products have been captured yet.",
          priceSummary: null,
          products: [],
          changes: [],
        }}
      />,
    );
    expect(screen.getByText("No competitor products have been captured yet.")).toBeInTheDocument();
    expect(screen.queryByText("No matching competitor data found.")).not.toBeInTheDocument();
  });
});
