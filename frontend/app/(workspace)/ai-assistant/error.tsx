"use client";

export default function AssistantError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="rounded border border-rose-200 bg-white px-4 py-8 text-center sm:px-6">
      <p className="text-base font-semibold text-slate-900">Something went wrong</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
        We couldn&apos;t load the AI Analyst. Your competitor data is unchanged. Try again.
      </p>
      <button type="button" className="button-primary mt-4" onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
