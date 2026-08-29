import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeAnalystRequest, isAbortError } from "@/lib/fake-analyst-request";

describe("fakeAnalystRequest", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves for a forced success outcome", async () => {
    vi.useFakeTimers();
    const pending = fakeAnalystRequest({ outcome: "success", delayMs: 40 });
    await vi.advanceTimersByTimeAsync(40);
    await expect(pending).resolves.toBeUndefined();
  });

  it("rejects for a forced error outcome", async () => {
    vi.useFakeTimers();
    const pending = fakeAnalystRequest({ outcome: "error", delayMs: 40 });
    const assertion = expect(pending).rejects.toThrow("ANALYSIS_FAILED");
    await vi.advanceTimersByTimeAsync(40);
    await assertion;
  });

  it("ignores the result when aborted", async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const pending = fakeAnalystRequest({ signal: controller.signal, outcome: "success", delayMs: 80 });
    const assertion = expect(pending).rejects.toSatisfy(isAbortError);
    controller.abort();
    await assertion;
  });
});
