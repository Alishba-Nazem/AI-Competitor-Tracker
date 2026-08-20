import { fetchJson } from './http';
import { resolveShopifyAvailability } from './availability';
import type { DiscoveredProduct } from './platform';

type ShopifyCatalogProduct = {
  id?: number | string;
  title?: string;
  handle?: string;
  images?: Array<{ src?: string }>;
  variants?: Array<{ available?: boolean }>;
};

type ShopifyCatalog = {
  products?: ShopifyCatalogProduct[];
};

const PAGE_SIZE = 50;
const MAX_PRODUCTS = 24;

export async function discoverShopifyProducts(
  storeUrl: string,
): Promise<DiscoveredProduct[]> {
  let origin: string;
  try {
    origin = new URL(storeUrl).origin;
  } catch {
    return [];
  }

  const discovered: DiscoveredProduct[] = [];
  const seen = new Set<string>();

  for (let page = 1; page <= 5 && discovered.length < 80; page += 1) {
    const catalog = await fetchJson<ShopifyCatalog>(
      `${origin}/products.json?limit=${PAGE_SIZE}&page=${page}`,
    );
    const products = catalog?.products;
    if (!Array.isArray(products) || products.length === 0) {
      break;
    }

    for (const product of products) {
      if (discovered.length >= 80) break;
      if (typeof product.handle !== 'string' || !product.handle.trim())
        continue;
      if (typeof product.title !== 'string' || !product.title.trim()) continue;

      const url = `${origin}/products/${product.handle}`;
      if (seen.has(url)) continue;
      seen.add(url);

      const variants = product.variants ?? [];
      discovered.push({
        name: product.title.trim(),
        url,
        externalId: product.id !== undefined ? String(product.id) : undefined,
        imageUrl: product.images?.find((image) => image.src)?.src,
        availability: resolveShopifyAvailability(variants),
      });
    }
  }

  return [
    ...discovered.filter((product) => product.availability === 'IN_STOCK'),
    ...discovered.filter((product) => product.availability !== 'IN_STOCK'),
  ].slice(0, MAX_PRODUCTS);
}
