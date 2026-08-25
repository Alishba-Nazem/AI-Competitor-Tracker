import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StreamMarkdown } from "@/components/stream-markdown";

describe("StreamMarkdown", () => {
  it("renders complete bold without waiting for the rest of the reply", () => {
    render(<StreamMarkdown text="**Price down** on the tote" />);
    expect(screen.getByText("Price down")).toBeInTheDocument();
  });

  it("does not leave a broken marker when bold is still streaming", () => {
    render(<StreamMarkdown text="Watch **straps" />);
    expect(screen.getByText(/Watch straps/)).toBeInTheDocument();
    expect(screen.queryByText("**")).not.toBeInTheDocument();
  });
});
