/** Matches `Product.currentPrice` / `SnapshotProduct.price` `@db.Decimal(12, 2)`. */
export const MAX_PERSISTABLE_PRICE = 9_999_999_999.99;

/**
 * Postgres NUMERIC(12,2) rejects values >= 10^10. A single oversized JSON-LD
 * price (for example a 13-digit GTIN copied into Offer.price) would otherwise
 * abort the whole capture transaction and store no prices for the competitor.
 */
export function isPersistableCapturedPrice(price: number): boolean {
  return (
    typeof price === 'number' &&
    Number.isFinite(price) &&
    price > 0 &&
    price <= MAX_PERSISTABLE_PRICE
  );
}
