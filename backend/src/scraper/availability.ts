import type { Availability } from './platform';

export type { Availability };

type ShopifyVariantAvailability = {
  id?: number | string;
  available?: boolean;
};

type DarazSkuAvailability = {
  operation?: { disable?: boolean };
};

export function resolveShopifyAvailability(
  variants: ShopifyVariantAvailability[] | undefined,
  requestedVariantId?: string,
): Availability {
  const all = Array.isArray(variants) ? variants : [];
  const relevant = requestedVariantId
    ? all.filter((variant) => String(variant.id) === requestedVariantId)
    : all;

  if (relevant.length === 0) {
    return 'UNKNOWN';
  }

  const known = relevant.filter(
    (variant) => typeof variant.available === 'boolean',
  );
  if (known.some((variant) => variant.available === true)) {
    return 'IN_STOCK';
  }
  if (
    known.length === relevant.length &&
    known.every((variant) => variant.available === false)
  ) {
    return 'OUT_OF_STOCK';
  }
  return 'UNKNOWN';
}

export function resolveDarazAvailability(
  sku: DarazSkuAvailability | undefined,
): Availability {
  const disabled = sku?.operation?.disable;
  if (disabled === false) return 'IN_STOCK';
  if (disabled === true) return 'OUT_OF_STOCK';
  return 'UNKNOWN';
}

export function resolveCatalogAvailability(inStock: unknown): Availability {
  if (inStock === true) return 'IN_STOCK';
  if (inStock === false) return 'OUT_OF_STOCK';
  return 'UNKNOWN';
}

export function isKnownAvailability(
  value: string | null | undefined,
): value is 'IN_STOCK' | 'OUT_OF_STOCK' {
  return value === 'IN_STOCK' || value === 'OUT_OF_STOCK';
}
