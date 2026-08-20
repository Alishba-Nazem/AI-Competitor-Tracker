import type { ChangeType, DetectedChange } from "./types";

export function hostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function dateLabel(date?: string) {
  return date
    ? new Date(date).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Not checked yet";
}

export function dateTimeLabel(date?: string) {
  return date ? new Date(date).toLocaleString() : "—";
}

export function relativeTime(date?: string) {
  if (!date) return "Not captured";
  const timestamp = Date.parse(date);
  if (!Number.isFinite(timestamp)) return "—";

  const deltaMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (deltaMs < minute) return "Just now";
  if (deltaMs < hour) {
    const minutes = Math.floor(deltaMs / minute);
    return `${minutes} min ago`;
  }
  if (deltaMs < day) {
    const hours = Math.floor(deltaMs / hour);
    return `${hours} hr ago`;
  }
  const days = Math.floor(deltaMs / day);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function relativeFuture(date?: string | null) {
  if (!date) return "soon";
  const timestamp = Date.parse(date);
  if (!Number.isFinite(timestamp)) return "soon";
  const deltaMs = timestamp - Date.now();
  if (deltaMs <= 0) return "due now";
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (deltaMs < hour) {
    const minutes = Math.max(1, Math.floor(deltaMs / minute));
    return `in ${minutes} min`;
  }
  if (deltaMs < day) {
    const hours = Math.floor(deltaMs / hour);
    return `in ${hours} hr`;
  }
  const days = Math.floor(deltaMs / day);
  return `in ${days} day${days === 1 ? "" : "s"}`;
}

export function availabilityLabel(value?: string | null) {
  if (value === "IN_STOCK") return "In stock";
  if (value === "OUT_OF_STOCK") return "Out of stock";
  return "Unknown";
}

export function availabilityChangeSentence(change: DetectedChange) {
  if (
    change.previousAvailability === "OUT_OF_STOCK" &&
    change.currentAvailability === "IN_STOCK"
  ) {
    return `${change.productName} is back in stock`;
  }
  return `${change.productName} changed from ${availabilityLabel(
    change.previousAvailability,
  )} to ${availabilityLabel(change.currentAvailability)}`;
}

export function changeSentence(type: ChangeType, change?: DetectedChange) {
  if (type === "AVAILABILITY_CHANGE") {
    return change ? availabilityChangeSentence(change) : "Availability changed";
  }
  if (type === "PRICE_INCREASE") return "Price increased";
  if (type === "PRICE_DECREASE") return "Price decreased";
  if (type === "NEW_PRODUCT") return "New product";
  return "Removed product";
}

export function formatPrice(price: number | undefined, currency: string) {
  if (price === undefined || Number.isNaN(price)) return "—";
  return `${currency} ${Number(price).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function changeLabel(type: ChangeType) {
  return type
    .replaceAll("_", " ")
    .replace("PRICE ", "")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function badgeClass(type: ChangeType) {
  if (type === "PRICE_INCREASE") return "badge-amber";
  if (type === "PRICE_DECREASE") return "badge-blue";
  if (type === "NEW_PRODUCT") return "badge-green";
  if (type === "AVAILABILITY_CHANGE") return "badge-amber";
  return "badge-rose";
}

export function reviewsStatus(platform?: string | null) {
  const label = platform === "SHOPIFY" || platform === "DARAZ" ? platform : "this competitor";
  return {
    available: false,
    title: "Reviews unavailable",
    text: `Public review data is not available for ${label}. This tracker does not invent ratings, comments, or review insights.`,
  };
}

export function priceMovement(change: DetectedChange) {
  return `${formatPrice(change.previousPrice, change.currency)} → ${formatPrice(change.currentPrice, change.currency)}`;
}

export function isAwaitingCapture(currentPrice: string | number) {
  return Number(currentPrice) === 0;
}

export function latestSnapshotFor(
  snapshots: Array<{ competitorId: number; createdAt: string; id: number }>,
  competitorId: number,
) {
  return snapshots
    .filter((snapshot) => snapshot.competitorId === competitorId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id - a.id)[0];
}

export function productLastChecked(
  productId: number,
  snapshots: Array<{ id: number; createdAt: string }>,
  snapshotProducts: Record<number, Array<{ productId: number }>>,
) {
  const match = [...snapshots]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .find((snapshot) =>
      (snapshotProducts[snapshot.id] ?? []).some((item) => item.productId === productId),
    );
  return match?.createdAt;
}
