import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  RatingHistogram,
  SentimentChart,
  ThemeBars,
  sentimentFromDistribution,
} from "@/components/charts";

describe("sentimentFromDistribution", () => {
  it("splits a stored star distribution into likes and dislikes", () => {
    const sentiment = sentimentFromDistribution(
      { "1": 1, "2": 1, "3": 2, "4": 3, "5": 3 },
      12,
    );

    expect(sentiment.positive).toBe(6);
    expect(sentiment.neutral).toBe(2);
    expect(sentiment.negative).toBe(2);
    expect(sentiment.rated).toBe(10);
    expect(sentiment.unrated).toBe(2);
    expect(sentiment.averageRating).toBe(3.6);
  });

  it("never reports a percentage when no review is rated", () => {
    const sentiment = sentimentFromDistribution({}, 4);

    expect(sentiment.rated).toBe(0);
    expect(sentiment.positivePercent).toBeNull();
    expect(sentiment.averageRating).toBeNull();
  });
});

describe("SentimentChart", () => {
  it("renders every share as readable text, not only as a drawing", () => {
    render(
      <SentimentChart
        sentiment={sentimentFromDistribution({ "1": 1, "2": 1, "3": 2, "4": 3, "5": 3 }, 10)}
      />,
    );

    expect(screen.getByText("6 (60%)")).toBeInTheDocument();
    // Mixed and disliked both land on 2 of 10 reviews.
    expect(screen.getAllByText("2 (20%)")).toHaveLength(2);
    expect(screen.getByText(/10 rated reviews/)).toBeInTheDocument();
  });

  it("asks for a capture instead of guessing when nothing is rated", () => {
    render(<SentimentChart sentiment={sentimentFromDistribution({}, 0)} />);

    expect(screen.getByRole("status")).toHaveTextContent("No star ratings stored yet");
  });
});

describe("RatingHistogram and ThemeBars", () => {
  it("shows each star bucket count", () => {
    render(<RatingHistogram distribution={{ "1": 1, "2": 0, "3": 2, "4": 3, "5": 4 }} />);

    expect(screen.getByText("5★")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("falls back to an explanation when a theme list is empty", () => {
    render(<ThemeBars title="Customers like" items={[]} tone="positive" empty="No positive themes yet." />);

    expect(screen.getByText("No positive themes yet.")).toBeInTheDocument();
  });
});
