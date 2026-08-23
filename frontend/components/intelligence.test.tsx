import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FindingList } from "./intelligence";

describe("FindingList", () => {
  it("shows the empty copy when there are no findings", () => {
    render(<FindingList findings={[]} emptyText="No price changes yet." />);
    expect(screen.getByText("No price changes yet.")).toBeInTheDocument();
  });

  it("renders finding titles and details", () => {
    render(
      <FindingList
        emptyText="No findings."
        findings={[
          {
            kind: "PRICE_DECREASE",
            title: "Ayan mall reduced a price",
            detail: "Shoulder bag went from PKR 2,000 to PKR 1,800.",
            competitorId: 10,
          },
        ]}
      />,
    );
    expect(screen.getByText("Price down")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ayan mall reduced a price" })).toHaveAttribute(
      "href",
      "/competitors/10",
    );
    expect(screen.getByText(/Shoulder bag went from PKR 2,000/)).toBeInTheDocument();
  });
});
