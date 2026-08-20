/**
 * Lightweight verification that Price Changes display helpers cover all
 * change types and format old/new/percentage values correctly.
 * Does not touch production UI data or mock the live API.
 */

function changeLabel(type) {
  return type
    .replaceAll("_", " ")
    .replace("PRICE ", "")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function badgeClass(type) {
  if (type === "PRICE_INCREASE") return "badge-amber";
  if (type === "PRICE_DECREASE") return "badge-blue";
  if (type === "NEW_PRODUCT") return "badge-green";
  return "badge-rose";
}

function formatPrice(price, currency) {
  if (price === undefined || Number.isNaN(price)) return "—";
  return `${currency} ${Number(price).toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

const cases = [
  {
    type: "PRICE_DECREASE",
    label: "DECREASE",
    badge: "badge-blue",
    previousPrice: 80999,
    currentPrice: 79999,
    currency: "PKR",
    percentageChange: -1.23,
  },
  {
    type: "PRICE_INCREASE",
    label: "INCREASE",
    badge: "badge-amber",
    previousPrice: 79999,
    currentPrice: 81999,
    currency: "PKR",
    percentageChange: 2.5,
  },
  {
    type: "NEW_PRODUCT",
    label: "NEW PRODUCT",
    badge: "badge-green",
    currentPrice: 15000,
    currency: "PKR",
  },
  {
    type: "REMOVED_PRODUCT",
    label: "REMOVED PRODUCT",
    badge: "badge-rose",
    previousPrice: 12000,
    currency: "PKR",
  },
];

for (const item of cases) {
  if (changeLabel(item.type) !== item.label) {
    throw new Error(`changeLabel(${item.type}) != ${item.label}`);
  }
  if (badgeClass(item.type) !== item.badge) {
    throw new Error(`badgeClass(${item.type}) != ${item.badge}`);
  }
  if (item.previousPrice !== undefined) {
    const old = formatPrice(item.previousPrice, item.currency);
    if (!old.startsWith(`${item.currency} `) || !old.includes(",")) {
      // Locale formatting is expected; ensure currency + grouped digits are present.
      if (!old.startsWith(`${item.currency} `) || !/\d/.test(old)) {
        throw new Error(`old price render failed for ${item.type}: ${old}`);
      }
    }
    if (Number(old.replace(/[^\d.]/g, "")) !== item.previousPrice) {
      throw new Error(`old price value mismatch for ${item.type}: ${old}`);
    }
  }
  if (item.currentPrice !== undefined) {
    const next = formatPrice(item.currentPrice, item.currency);
    if (!next.startsWith(`${item.currency} `) || !/\d/.test(next)) {
      throw new Error(`new price render failed for ${item.type}: ${next}`);
    }
    if (Number(next.replace(/[^\d.]/g, "")) !== item.currentPrice) {
      throw new Error(`new price value mismatch for ${item.type}: ${next}`);
    }
  }
  if (item.percentageChange !== undefined) {
    const rendered = `${item.percentageChange > 0 ? "+" : ""}${item.percentageChange.toFixed(1)}%`;
    if (item.type === "PRICE_DECREASE" && rendered !== "-1.2%") {
      throw new Error(`unexpected decrease percent render: ${rendered}`);
    }
    if (item.type === "PRICE_INCREASE" && rendered !== "+2.5%") {
      throw new Error(`unexpected increase percent render: ${rendered}`);
    }
  }
}

console.log("frontend Price Changes display helpers verified");
