import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SignupForm } from "@/app/(auth)/signup/signup-form";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    signup: vi.fn(),
  },
}));

import { api } from "@/lib/api";

function fillSignup(name: string, email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: name } });
  fireEvent.change(screen.getByLabelText("Work email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
}

describe("SignupForm", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(api.signup).mockReset();
  });

  it("rejects a short password without calling the API", async () => {
    render(<SignupForm />);
    fillSignup("Ayan", "seller@store.com", "short");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Password must be at least 8 characters.");
    expect(api.signup).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it("creates an account and continues to onboarding when the form is valid", async () => {
    vi.mocked(api.signup).mockResolvedValue({
      token: "test-token",
      user: { id: 1, name: "Ayan", email: "seller@store.com" },
    });
    render(<SignupForm />);
    fillSignup("Ayan", "seller@store.com", "long-enough");
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => {
      expect(api.signup).toHaveBeenCalledWith({
        name: "Ayan",
        email: "seller@store.com",
        password: "long-enough",
      });
      expect(replace).toHaveBeenCalledWith("/onboarding");
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
