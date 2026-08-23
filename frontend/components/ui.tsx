"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Field } from "@/components/field";
import type { ChangeType, DetectedChange } from "@/lib/types";
import { badgeClass, changeLabel, formatPrice, availabilityLabel, availabilityChangeSentence } from "@/lib/format";

export { Field };

export function Panel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold tracking-tight text-slate-900">{title}</h2>}
            {description && <p className="mt-1 text-sm text-stone-600">{description}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <div className="panel !p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-700">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-stone-600">{detail}</p>
    </div>
  );
}

export function EmptyState({
  title,
  text,
  actionLabel,
  onAction,
}: {
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="rounded border border-dashed border-slate-200 bg-slate-50/70 px-5 py-8 text-center">
      <p className="font-semibold text-slate-800">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-stone-600">{text}</p>
      {actionLabel && onAction && (
        <button type="button" className="button-primary mt-4" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function LoadingState({ text }: { text: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-5 py-10 text-center text-sm text-stone-600" role="status" aria-live="polite">
      <span className="mr-2 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700 align-[-2px]" aria-hidden="true" />
      {text}
    </div>
  );
}

export function Avatar({ name }: { name: string }) {
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sky-50 text-sm font-bold text-sky-700">
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

export function AvailabilityBadge({ value }: { value?: string | null }) {
  if (value === "IN_STOCK") return <span className="badge badge-green">In stock</span>;
  if (value === "OUT_OF_STOCK") return <span className="badge badge-rose">Out of stock</span>;
  return <span className="badge badge-gray">Unknown</span>;
}

export function StatusBadge({ active }: { active: boolean }) {
  return <span className={`badge ${active ? "badge-green" : "badge-gray"}`}>{active ? "Active" : "Inactive"}</span>;
}

export function CaptureStatusBadge({
  pending,
  capturing,
  failed,
}: {
  pending: boolean;
  capturing?: boolean;
  failed?: boolean;
}) {
  if (capturing) return <span className="badge badge-blue">Capturing…</span>;
  if (failed) return <span className="badge badge-rose">Capture failed</span>;
  if (pending) return <span className="badge badge-gray">Awaiting capture</span>;
  return <span className="badge badge-green">Captured</span>;
}

export function ScrapeMethodBadge({ method }: { method?: string | null }) {
  if (!method || method === "unsupported") return null;
  if (method === "jsonld") {
    return <span className="badge badge-blue">Detected via structured data</span>;
  }
  if (method === "daraz") return <span className="badge badge-gray">Daraz</span>;
  if (method === "shopify") return <span className="badge badge-gray">Shopify</span>;
  return <span className="badge badge-gray">{method}</span>;
}

export function CaptureLogStatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="badge badge-gray">Never captured</span>;
  if (status === "success") return <span className="badge badge-green">Last capture OK</span>;
  if (status === "partial") return <span className="badge badge-blue">Partial capture</span>;
  if (status === "failed") return <span className="badge badge-rose">Capture failed</span>;
  return <span className="badge badge-gray">{status}</span>;
}

export function ChangeBadge({
  type,
  percentage,
}: {
  type: ChangeType;
  percentage?: number | null;
}) {
  return (
    <span className={`badge ${badgeClass(type)}`}>
      {changeLabel(type)}
      {percentage !== undefined && percentage !== null
        ? ` ${percentage > 0 ? "+" : ""}${percentage.toFixed(1)}%`
        : ""}
    </span>
  );
}

export function Modal({
  title,
  description,
  children,
  onClose,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/40 p-4 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h2>
            {description && <p className="mt-1 text-sm text-stone-600">{description}</p>}
          </div>
          <button
            type="button"
            className="grid h-8 w-8 place-items-center rounded-lg text-stone-700 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ModalActions({
  onCancel,
  submitLabel,
  disabled,
  cancelDisabled,
}: {
  onCancel: () => void;
  submitLabel: string;
  disabled?: boolean;
  cancelDisabled?: boolean;
}) {
  return (
    <div className="flex justify-end gap-3 pt-2">
      <button type="button" className="button-secondary" onClick={onCancel} disabled={cancelDisabled}>
        Cancel
      </button>
      <button type="submit" className="button-primary" disabled={disabled}>
        {submitLabel}
      </button>
    </div>
  );
}

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: Array<{ key: string; label: string; count?: number }>;
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            active === tab.key
              ? "bg-white text-slate-900 shadow-sm"
              : "text-stone-600 hover:text-slate-800"
          }`}
        >
          {tab.label}
          {typeof tab.count === "number" && (
            <span className="ml-2 text-xs font-bold text-stone-700">{tab.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-stone-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-sm font-semibold text-stone-600 hover:text-slate-800">
      ← {label}
    </Link>
  );
}

export function ChangeRow({
  change,
  competitorName,
  detectedAt,
  detailed = false,
}: {
  change: DetectedChange;
  competitorName?: string;
  detectedAt?: string;
  detailed?: boolean;
}) {
  const isPriceChange = change.type === "PRICE_INCREASE" || change.type === "PRICE_DECREASE";
  const isAvailabilityChange = change.type === "AVAILABILITY_CHANGE";
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-900">{change.productName}</p>
          <ChangeBadge type={change.type} percentage={change.percentageChange} />
        </div>
        <p className="mt-1 truncate text-sm text-stone-600">
          {[competitorName, detectedAt].filter(Boolean).join(" · ") || change.productUrl}
        </p>
        {isAvailabilityChange && (
          <p className="mt-1 text-sm text-slate-600">{availabilityChangeSentence(change)}</p>
        )}
      </div>
      {detailed && isPriceChange && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-stone-700">Old</p>
            <p className="font-semibold">{formatPrice(change.previousPrice, change.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-700">New</p>
            <p className="font-semibold">{formatPrice(change.currentPrice, change.currency)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-700">Difference</p>
            <p className="font-semibold">
              {change.priceDifference === undefined
                ? "—"
                : formatPrice(Math.abs(change.priceDifference), change.currency)}
            </p>
          </div>
          <div>
            <p className="text-xs text-stone-700">Change</p>
            <p className="font-semibold">
              {change.percentageChange === undefined || change.percentageChange === null
                ? "—"
                : `${change.percentageChange > 0 ? "+" : ""}${change.percentageChange.toFixed(1)}%`}
            </p>
          </div>
        </div>
      )}
      {detailed && isAvailabilityChange && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          <div>
            <p className="text-xs text-stone-700">Previous</p>
            <p className="font-semibold">{availabilityLabel(change.previousAvailability)}</p>
          </div>
          <div>
            <p className="text-xs text-stone-700">Current</p>
            <p className="font-semibold">{availabilityLabel(change.currentAvailability)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
