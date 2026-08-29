import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MotionConfig } from "framer-motion";
import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  MotionLifecycleButton,
  type MotionLifecycleButtonHandle,
} from "@/components/motion-lifecycle-button";

function renderButton(
  onSubmit: (signal: AbortSignal) => Promise<void>,
  extra?: { disabled?: boolean },
) {
  const ref = createRef<MotionLifecycleButtonHandle>();
  render(
    <MotionConfig reducedMotion="always">
      <MotionLifecycleButton ref={ref} onSubmit={onSubmit} disabled={extra?.disabled}>
        Send to AI Analyst
      </MotionLifecycleButton>
    </MotionConfig>,
  );
  return ref;
}

describe("MotionLifecycleButton", () => {
  it("starts idle and is keyboard focusable", () => {
    renderButton(async () => undefined);
    const button = screen.getByRole("button", { name: /Send to AI Analyst/i });
    expect(button).toBeEnabled();
    expect(button).not.toHaveAttribute("aria-busy", "true");
    button.focus();
    expect(button).toHaveFocus();
  });

  it("enters loading, ignores a second click, then shows success", async () => {
    let finish!: () => void;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    renderButton(onSubmit);
    const button = screen.getByRole("button", { name: /Send to AI Analyst/i });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("button", { name: /Analyzing/i })).toHaveAttribute("aria-busy", "true");
    await act(async () => {
      finish();
    });
    expect(await screen.findByRole("button", { name: /Analysis complete/i })).toBeInTheDocument();
  });

  it("shows Try again on error and restarts on the next click", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(new Error("ANALYSIS_FAILED"))
      .mockResolvedValueOnce(undefined);
    renderButton(onSubmit);
    fireEvent.click(screen.getByRole("button", { name: /Send to AI Analyst/i }));
    const retry = await screen.findByRole("button", { name: /Try again/i });
    expect(retry).not.toHaveAttribute("aria-busy", "true");
    fireEvent.click(retry);
    expect(onSubmit).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("button", { name: /Analyzing/i })).toBeInTheDocument();
  });

  it("reset cancels an in-flight request so a late success cannot overwrite idle", async () => {
    let finish!: () => void;
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const ref = renderButton(onSubmit);
    fireEvent.click(screen.getByRole("button", { name: /Send to AI Analyst/i }));
    await screen.findByRole("button", { name: /Analyzing/i });
    act(() => {
      ref.current?.reset();
    });
    expect(screen.getByRole("button", { name: /Send to AI Analyst/i })).toBeInTheDocument();
    await act(async () => {
      finish();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Send to AI Analyst/i })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Analysis complete/i })).not.toBeInTheDocument();
  });

  it("does not start when disabled", () => {
    const onSubmit = vi.fn(async () => undefined);
    renderButton(onSubmit, { disabled: true });
    fireEvent.click(screen.getByRole("button", { name: /Send to AI Analyst/i }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /Send to AI Analyst/i })).toBeDisabled();
  });
});
