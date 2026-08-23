import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BriefingPanel } from "./briefing-panel";

describe("BriefingPanel", () => {
  it("announces loading while Claude writes the briefing", () => {
    render(<BriefingPanel briefing={null} loading error={null} />);
    expect(screen.getByText(/Writing briefing/i)).toHaveAttribute("aria-busy", "true");
  });

  it("shows an accessible error when the request fails", () => {
    render(
      <BriefingPanel briefing={null} loading={false} error="Failed to load AI briefing." />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Failed to load AI briefing.");
  });

  it("renders a Claude briefing with next actions", () => {
    render(
      <BriefingPanel
        loading={false}
        error={null}
        briefing={{
          source: "claude",
          available: true,
          headline: "Rivals cut bag prices",
          bullets: ["Ayan mall dropped a shoulder bag 10%."],
          risks: ["Delivery complaints are repeating."],
          nextActions: ["Recheck your own listing price."],
        }}
      />,
    );
    expect(screen.getByText("Claude briefing")).toBeInTheDocument();
    expect(screen.getByText("Rivals cut bag prices")).toBeInTheDocument();
    expect(screen.getByText("Recheck your own listing price.")).toBeInTheDocument();
  });

  it("explains the empty state when nothing is captured", () => {
    render(
      <BriefingPanel
        loading={false}
        error={null}
        briefing={{
          source: "fallback",
          available: false,
          headline: "No captured competitor data yet",
          bullets: [],
          risks: [],
          nextActions: [],
          message: "Add competitors and capture store data first.",
        }}
      />,
    );
    expect(screen.getByRole("status")).toHaveTextContent(
      "Add competitors and capture store data first.",
    );
  });
});
