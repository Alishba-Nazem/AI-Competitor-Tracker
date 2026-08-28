"use client";

export function ChatFailureCard({
  title,
  detail,
  onRetry,
  retrying = false,
  retryable = true,
}: {
  title: string;
  detail: string;
  onRetry?: () => void;
  retrying?: boolean;
  retryable?: boolean;
}) {
  return (
    <div
      className="rounded border border-rose-200 border-l-4 border-l-rose-700 bg-rose-50 px-3 py-3"
      role="alert"
    >
      <p className="text-sm font-semibold text-rose-900">{title}</p>
      <p className="mt-1 text-sm leading-6 text-rose-800">{detail}</p>
      {retryable && onRetry ? (
        <button
          type="button"
          className="button-secondary mt-3 !border-rose-200 !bg-white !text-rose-900"
          onClick={onRetry}
          disabled={retrying}
        >
          {retrying ? "Retrying..." : "Retry"}
        </button>
      ) : null}
    </div>
  );
}
