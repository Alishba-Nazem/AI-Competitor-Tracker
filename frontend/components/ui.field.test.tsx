import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Field } from "./field";

describe("Field", () => {
  it("associates the visible label with the input", () => {
    render(
      <Field label="Work email" hint="Use your store email.">
        <input type="email" />
      </Field>,
    );

    const input = screen.getByLabelText("Work email");
    expect(input).toHaveAttribute("id");
    expect(input).toHaveAccessibleDescription("Use your store email.");
  });

  it("marks the control invalid and announces field errors", () => {
    render(
      <Field label="Password" error="Password must be at least 8 characters.">
        <input type="password" />
      </Field>,
    );

    expect(screen.getByLabelText("Password")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Password must be at least 8 characters.");
  });
});
