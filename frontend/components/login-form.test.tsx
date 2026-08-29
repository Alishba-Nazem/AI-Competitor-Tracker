import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LoginForm } from "@/app/(auth)/login/login-form";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}));

vi.mock("@/lib/api", () => ({
  api: {
    login: vi.fn(),
    getOnboardingStatus: vi.fn(),
  },
}));

import { api } from "@/lib/api";

function fillLogin(email: string, password: string) {
  fireEvent.change(screen.getByLabelText("Work email"), { target: { value: email } });
  fireEvent.change(screen.getByLabelText("Password"), { target: { value: password } });
}

describe("LoginForm", () => {
  beforeEach(() => {
    replace.mockReset();
    vi.mocked(api.login).mockReset();
    vi.mocked(api.getOnboardingStatus).mockReset();
  });

  it("labels email and password fields", () => {
    render(<LoginForm />);
    expect(screen.getByLabelText("Work email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("shows validation feedback when sign-in is rejected", async () => {
    vi.mocked(api.login).mockRejectedValue(new Error("Invalid email or password."));
    render(<LoginForm />);
    fillLogin("seller@store.com", "wrong-password");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
    expect(replace).not.toHaveBeenCalled();
  });

  it("signs in and routes to research when credentials are valid", async () => {
    vi.mocked(api.login).mockResolvedValue({
      token: "test-token",
      user: { id: 1, name: "Ayan", email: "seller@store.com" },
    });
    vi.mocked(api.getOnboardingStatus).mockResolvedValue({ completed: true, profile: null });
    render(<LoginForm />);
    fillLogin("seller@store.com", "correct-password");
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith({ email: "seller@store.com", password: "correct-password" });
      expect(replace).toHaveBeenCalledWith("/");
    });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
