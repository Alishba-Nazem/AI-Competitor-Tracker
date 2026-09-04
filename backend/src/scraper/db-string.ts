/** Matches `Product.name` / `SnapshotProduct.name` `@db.VarChar(255)`. */
export const PRODUCT_NAME_MAX_CHARS = 255;
/** Matches `Product.externalId` `@db.VarChar(64)`. */
export const PRODUCT_EXTERNAL_ID_MAX_CHARS = 64;

/**
 * Clip a scraped/discovered string to a Postgres VARCHAR(n) character budget.
 * Code-point aware so a 255-char Daraz title cannot abort a capture transaction.
 */
export function clipDbString(value: string, maxChars: number): string {
  const chars = [...value];
  if (chars.length <= maxChars) return value;
  return chars.slice(0, maxChars).join('');
}
