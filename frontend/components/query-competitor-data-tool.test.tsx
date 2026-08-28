import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QueryCompetitorDataToolPart } from "@/components/query-competitor-data-tool";
import type { QueryCompetitorDataOutput } from "@/lib/ai/tools/query-competitor-data";

const output: QueryCompetitorDataOutput = {
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

describe("QueryCompetitorDataToolPart", () => {
  it("renders a preparing state while input is streaming", () => {
    render(
      <QueryCompetitorDataToolPart
        part={{ toolCallId: "t1", state: "input-streaming", input: undefined }}
      />,
    );
    expect(screen.getByText(/Preparing competitor data query/)).toBeInTheDocument();
  });

  it("shows the validated tool input", () => {
    render(
      <QueryCompetitorDataToolPart
        part={{
          toolCallId: "t1",
          state: "input-available",
          input: { competitorName: "Ayan Mall", productName: "Tote Bag", changeType: "PRICE_DECREASE" },
        }}
      />,
    );
    expect(screen.getByText("Calling competitor data tool")).toBeInTheDocument();
    expect(screen.getByText("Ayan Mall")).toBeInTheDocument();
    expect(screen.getByText("Tote Bag")).toBeInTheDocument();
  });

  it("renders captured results through the price-change card", () => {
    render(
      <QueryCompetitorDataToolPart
        part={{ toolCallId: "t1", state: "output-available", input: {}, output }}
      />,
    );
    expect(screen.getByText("Tote Bag")).toBeInTheDocument();
    expect(screen.getByText("PKR 2,050")).toBeInTheDocument();
  });

  it("renders a designed error state and retry without crashing", () => {
    const onRetry = vi.fn();
    render(
      <QueryCompetitorDataToolPart
        part={{
          toolCallId: "t1",
          state: "output-error",
          input: {},
          errorText: "Couldn't retrieve competitor data\n    at execute (query.ts:12:3)",
        }}
        onRetry={onRetry}
      />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't retrieve competitor data");
    expect(screen.queryByText(/at execute/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });
});
