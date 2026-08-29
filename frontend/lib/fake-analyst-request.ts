export type AnalystRequestOutcome = "success" | "error" | "random";

const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 2500;
const RANDOM_FAILURE_RATE = 0.2;

/**
 * Fake analyst round-trip for the motion lifecycle demo.
 * Honors AbortSignal so Reset/re-runs never apply stale results.
 */
export function fakeAnalystRequest(options: {
  signal?: AbortSignal;
  outcome?: AnalystRequestOutcome;
  delayMs?: number;
} = {}): Promise<void> {
  const { signal, outcome = "random", delayMs } = options;
  const wait = delayMs ?? MIN_DELAY_MS + Math.round(Math.random() * (MAX_DELAY_MS - MIN_DELAY_MS));
  const shouldFail = outcome === "error" || (outcome === "random" && Math.random() < RANDOM_FAILURE_RATE);

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortError());
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      if (signal?.aborted) {
        reject(abortError());
        return;
      }
      if (shouldFail) {
        reject(new Error("ANALYSIS_FAILED"));
        return;
      }
      resolve();
    }, wait);

    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };

    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function isAbortError(error: unknown) {
  return (
    (error instanceof DOMException && error.name === "AbortError") ||
    (error instanceof Error && error.name === "AbortError")
  );
}

function abortError() {
  return new DOMException("Aborted", "AbortError");
}
