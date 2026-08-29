import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddCompetitorModal } from "@/components/forms";
import { ToastProvider } from "@/components/toast";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    createCompetitor: vi.fn(),
    discoverCompetitor: vi.fn(),
  },
}));

import { api } from "@/lib/api";

function renderModal() {
  return render(
    <ToastProvider>
      <AddCompetitorModal open onClose={vi.fn()} />
    </ToastProvider>,
  );
}

describe("AddCompetitorModal", () => {
  beforeEach(() => {
    push.mockReset();
    vi.mocked(api.createCompetitor).mockReset();
    vi.mocked(api.discoverCompetitor).mockReset();
  });

  it("shows field validation when name and URL are invalid", () => {
    renderModal();
    fireEvent.change(screen.getByLabelText("Competitor / Store name"), { target: { value: "   " } });
    fireEvent.change(screen.getByLabelText("Store / Seller URL"), { target: { value: "not-a-url" } });
    fireEvent.submit(screen.getByRole("button", { name: "Add competitor" }).closest("form")!);
    const alerts = screen.getAllByRole("alert");
    expect(alerts.some((alert) => alert.textContent?.includes("Enter a competitor or store name."))).toBe(true);
    expect(alerts.some((alert) => alert.textContent?.includes("Enter a valid HTTP or HTTPS URL."))).toBe(true);
    expect(api.createCompetitor).not.toHaveBeenCalled();
  });

  it("adds the competitor when the form is valid", async () => {
    vi.mocked(api.createCompetitor).mockResolvedValue({
      id: 10,
      name: "Ayan Mall",
      url: "https://ayan.example",
      isActive: true,
    });
    vi.mocked(api.discoverCompetitor).mockResolvedValue({
      competitorId: 10,
      platform: "SHOPIFY",
      discovered: 12,
      created: 12,
      skipped: 0,
    });
    renderModal();
    fireEvent.change(screen.getByLabelText("Competitor / Store name"), { target: { value: "Ayan Mall" } });
    fireEvent.change(screen.getByLabelText("Store / Seller URL"), { target: { value: "https://ayan.example" } });
    fireEvent.click(screen.getByRole("button", { name: "Add competitor" }));
    await waitFor(() => {
      expect(api.createCompetitor).toHaveBeenCalledWith({
        name: "Ayan Mall",
        url: "https://ayan.example",
      });
      expect(api.discoverCompetitor).toHaveBeenCalledWith(10);
    });
    expect(await screen.findByRole("status")).toHaveTextContent("12 products discovered");
  });
});
