"use client";

import {
  cloneElement,
  isValidElement,
  useId,
  type ReactElement,
  type ReactNode,
} from "react";

export function Field({
  label,
  children,
  hint,
  error,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  error?: string;
}) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const describedBy = [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(" ") || undefined;
  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<Record<string, unknown>>, {
        id,
        "aria-invalid": Boolean(error) || undefined,
        "aria-describedby": describedBy,
      })
    : children;

  return (
    <div className="block">
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-stone-800">
        {label}
      </label>
      {control}
      {error ? (
        <span id={errorId} className="mt-1.5 block text-sm text-rose-800" role="alert">
          {error}
        </span>
      ) : null}
      {hint ? (
        <span id={hintId} className="mt-2 block text-xs text-stone-600">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
