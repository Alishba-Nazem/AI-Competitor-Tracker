import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AuthScreen } from "./auth-screen";

describe("AuthScreen", () => {
  it("renders the page heading and footer", () => {
    render(
      <AuthScreen title="Welcome back" subtitle="Sign in to continue." footer="New here? Create an account">
        <form>
          <label htmlFor="email">Work email</label>
          <input id="email" type="email" />
          <button type="submit">Sign in</button>
        </form>
      </AuthScreen>,
    );

    expect(screen.getByRole("heading", { name: "Welcome back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
    expect(screen.getByText("New here? Create an account")).toBeInTheDocument();
  });
});
