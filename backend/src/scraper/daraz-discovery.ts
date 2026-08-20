import { fetchJson } from './http';
import { resolveCatalogAvailability } from './availability';
import { absoluteUrl, type DiscoveredProduct } from './platform';

type DarazPageData = {
  sellerId?: number | string;
  shopId?: number | string;
  bizId?: number | string;
  sellerKey?: string;
  title?: string;
  catalogApiUrl?: string;
};

type DarazCatalogItem = {
  name?: string;
  nid?: number | string;
  itemId?: number | string;
  itemUrl?: string;
  productUrl?: string;
  sellerId?: number | string;
  image?: string;
  inStock?: boolean;
  isSponsored?: boolean;
};

type DarazCatalog = {
  mods?: { listItems?: DarazCatalogItem[] };
  mainInfo?: { noMorePages?: boolean; totalResults?: number };
};

const MAX_PRODUCTS = 60;
const MAX_CATALOG_PAGES = 10;
const RESERVED_DARAZ_PATHS = new Set([
  'catalog',
  'products',
  'wow',
  'channel',
  'pages',
  'index.html',
  'shop',
]);

export function parseDarazPageData(html: string): DarazPageData | undefined {
  const marker = 'window.pageData =';
  const start = html.indexOf(marker);
  if (start < 0) return undefined;
  return parseObjectLiteral(html, start + marker.length);
}

function parseObjectLiteral(source: string, jsonStart: number) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let end = -1;

  for (let index = jsonStart; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        end = index;
        break;
      }
    }
  }
  if (end < 0) return undefined;
  try {
    return JSON.parse(source.slice(jsonStart, end + 1)) as DarazPageData;
  } catch {
    return undefined;
  }
}

export function parseDarazShopName(html: string) {
  const title = html.match(/<title[^>]*>([^<]+)/i)?.[1];
  return title?.match(/Shop online with (.+?) now!/i)?.[1]?.trim();
}

export function parseDarazSellerKeyFromUrl(shopUrl: string) {
  let pathname = '';
  try {
    pathname = new URL(shopUrl).pathname;
  } catch {
    return undefined;
  }

  const parts = pathname.split('/').filter(Boolean);
  if (parts.length === 0) return undefined;

  if (parts[0].toLowerCase() === 'shop' && parts[1]) {
    return decodeURIComponent(parts[1]);
  }

  if (
    parts.length === 1 &&
    !RESERVED_DARAZ_PATHS.has(parts[0].toLowerCase())
  ) {
    return decodeURIComponent(parts[0]);
  }

  return undefined;
}

function normalizeSellerKey(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\s+/g, '-');
}

export async function discoverDarazProducts(
  shopUrl: string,
  html: string,
): Promise<DiscoveredProduct[]> {
  const origin = new URL(shopUrl).origin;
  const pathname = new URL(shopUrl).pathname;

  if (/\/products\//i.test(pathname)) {
    const name =
      html.match(
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)/i,
      )?.[1] ??
      html
        .match(/<title[^>]*>([^<]+)/i)?.[1]
        ?.replace(/\s+\|\s+Daraz\.pk.*$/i, '');
    return name?.trim()
      ? [
          {
            name: name.trim(),
            url: shopUrl.split('?')[0],
            externalId: extractItemId(shopUrl),
          },
        ]
      : [];
  }

  const pageData = parseDarazPageData(html);
  const sellerId =
    pageData?.sellerId !== undefined ? String(pageData.sellerId) : undefined;
  const shopId = pageData?.bizId ?? pageData?.shopId;
  const sellerKeys = uniqueStrings([
    parseDarazSellerKeyFromUrl(shopUrl),
    normalizeSellerKey(pageData?.sellerKey),
  ]);

  if (!sellerId && sellerKeys.length === 0 && shopId === undefined) {
    return [];
  }

  // Prefer in-shop wangpu catalog (shopId first — fastest and most complete).
  const wangpuProducts = await searchDarazWangpuCatalog(
    origin,
    sellerKeys,
    shopId,
    shopUrl,
  );
  if (wangpuProducts.length > 0) {
    return wangpuProducts;
  }

  if (!sellerId) {
    return [];
  }

  const shopName = parseDarazShopName(html);
  const queries = uniqueStrings([
    pageData?.sellerKey?.replace(/-/g, ' '),
    pageData?.sellerKey,
    shopName,
    shopName?.replace(/^\([^)]+\)\s*/, ''),
    pageData?.title && pageData.title !== 'Homepage' ? pageData.title : undefined,
  ]);

  for (const query of queries) {
    const products = await searchDarazCatalog(
      origin,
      query,
      sellerId,
      shopUrl,
    );
    if (products.length > 0) {
      return products;
    }
  }

  return [];
}

async function searchDarazWangpuCatalog(
  origin: string,
  sellerKeys: string[],
  shopId: number | string | undefined,
  referer: string,
) {
  // shopId catalog is usually faster and more reliable than sellerKey path.
  const endpoints = uniqueStrings([
    shopId !== undefined
      ? `${origin}/catalog/?ajax=true&from=wangpu&shopId=${encodeURIComponent(String(shopId))}&q=All-Products`
      : undefined,
    ...sellerKeys.map(
      (sellerKey) =>
        `${origin}/${encodeURIComponent(sellerKey)}/?q=All-Products&from=wangpu&langFlag=en&ajax=true`,
    ),
    // /shop/{key} storefronts also expose the same wangpu path under /shop/.
    ...sellerKeys.map(
      (sellerKey) =>
        `${origin}/shop/${encodeURIComponent(sellerKey)}/?q=All-Products&from=wangpu&langFlag=en&ajax=true`,
    ),
  ]);

  for (const endpoint of endpoints) {
    const products = await fetchDarazCatalogPages(endpoint, origin, referer);
    if (products.length > 0) {
      return products;
    }
  }

  return [];
}

async function fetchDarazCatalogPages(
  baseUrl: string,
  origin: string,
  referer: string,
  sellerId?: string,
) {
  const discovered: DiscoveredProduct[] = [];
  const seen = new Set<string>();
  const separator = baseUrl.includes('?') ? '&' : '?';

  for (
    let page = 1;
    page <= MAX_CATALOG_PAGES && discovered.length < MAX_PRODUCTS;
    page += 1
  ) {
    const catalog = await fetchJson<DarazCatalog>(
      `${baseUrl}${separator}page=${page}`,
      { Referer: referer },
    );
    const added = appendCatalogItems(
      catalog?.mods?.listItems,
      origin,
      seen,
      discovered,
      sellerId,
    );
    if (added === 0 && page === 1) {
      break;
    }
    if (catalog?.mainInfo?.noMorePages) break;
    // Empty later page means we're done even if noMorePages is missing.
    if (added === 0) break;
  }

  return discovered;
}

function appendCatalogItems(
  items: DarazCatalogItem[] | undefined,
  origin: string,
  seen: Set<string>,
  discovered: DiscoveredProduct[],
  sellerId?: string,
) {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  let added = 0;
  for (const item of items) {
    if (discovered.length >= MAX_PRODUCTS) break;
    if (sellerId && String(item.sellerId) !== sellerId) continue;
    if (item.isSponsored) continue;
    if (typeof item.name !== 'string' || !item.name.trim()) continue;

    const href = item.itemUrl || item.productUrl;
    if (!href) continue;
    const url = absoluteUrl(
      origin,
      href.startsWith('//') ? `https:${href}` : href,
    )?.split('?')[0];
    if (!url || seen.has(url)) continue;
    seen.add(url);

    discovered.push({
      name: item.name.trim(),
      url,
      externalId:
        item.nid !== undefined
          ? String(item.nid)
          : item.itemId !== undefined
            ? String(item.itemId)
            : extractItemId(url),
      imageUrl: item.image,
      availability: resolveCatalogAvailability(item.inStock),
    });
    added += 1;
  }

  return added;
}

async function searchDarazCatalog(
  origin: string,
  query: string,
  sellerId: string,
  referer: string,
) {
  return fetchDarazCatalogPages(
    `${origin}/catalog/?ajax=true&q=${encodeURIComponent(query)}`,
    origin,
    referer,
    sellerId,
  );
}

function extractItemId(url: string) {
  return url.match(/i(\d+)(?:\.html)?/i)?.[1];
}

function uniqueStrings(values: Array<string | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed.toLowerCase())) continue;
    seen.add(trimmed.toLowerCase());
    result.push(trimmed);
  }
  return result;
}
