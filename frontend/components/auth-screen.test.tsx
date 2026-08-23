import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthScreen } from "./auth-screen";

describe("AuthScreen", () => {
  it("renders the form and surfaces errors accessibly", () => {
    render(
      <AuthScreen
        title="Welcome back"
        subtitle="Sign in to continue."
        submitLabel="Sign in"
        submitting={false}
        error="Invalid email or password."
        onSubmit={vi.fn()}
        footer="New here? Create an account"
      >
        <label htmlFor="email">Work email</label>
        <input id="email" type="email" />
      </AuthScreen>,
    );

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid email or password.");
  });

  it("disables submit while the request is in flight", () => {
    render(
      <AuthScreen
        title="Create your workspace"
        subtitle="Start tracking."
        submitLabel="Create account"
        submitting
        onSubmit={vi.fn()}
        footer="Already have an account?"
      >
        <input aria-label="Password" type="password" />
      </AuthScreen>,
    );

    expect(screen.getByRole("button", { name: "Please wait…" })).toBeDisabled();
  });
});
