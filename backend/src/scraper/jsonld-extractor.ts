import * as cheerio from 'cheerio';
import type { Availability } from './platform';

export type ScrapeMethod = 'daraz' | 'shopify' | 'jsonld' | 'unsupported';

export type JsonLdProduct = {
  name?: string;
  price: number;
  currency: string;
  availability?: Availability;
  imageUrl?: string;
  scrapeMethod: 'jsonld';
};

type JsonLdNode = Record<string, unknown>;

/**
 * Extracts Product / Offer schema.org data from JSON-LD blocks.
 * Returns undefined when no trustworthy selling price is present — never guesses.
 */
export function extractJsonLdProduct(html: string): JsonLdProduct | undefined {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]').toArray();

  for (const script of scripts) {
    const raw = $(script).html()?.trim();
    if (!raw) continue;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }

    const nodes = flattenJsonLd(parsed);
    for (const node of nodes) {
      const product = readProductNode(node);
      if (product) return product;
    }
  }

  return undefined;
}

function flattenJsonLd(value: unknown): JsonLdNode[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenJsonLd(item));
  }
  if (!value || typeof value !== 'object') {
    return [];
  }
  const record = value as JsonLdNode;
  const graph = record['@graph'];
  if (Array.isArray(graph)) {
    return [record, ...graph.flatMap((item) => flattenJsonLd(item))];
  }
  return [record];
}

function hasType(node: JsonLdNode, typeName: string) {
  const type = node['@type'];
  if (typeof type === 'string') {
    return type.toLowerCase() === typeName.toLowerCase();
  }
  if (Array.isArray(type)) {
    return type.some(
      (item) =>
        typeof item === 'string' &&
        item.toLowerCase() === typeName.toLowerCase(),
    );
  }
  return false;
}

function readProductNode(node: JsonLdNode): JsonLdProduct | undefined {
  if (!hasType(node, 'Product') && !hasType(node, 'Offer')) {
    return undefined;
  }

  const offer = hasType(node, 'Offer')
    ? node
    : pickOffer(node.offers ?? node.offer);
  if (!offer) return undefined;

  const price = parsePrice(offer.price ?? offer.lowPrice);
  const currency = normalizeCurrency(
    typeof offer.priceCurrency === 'string'
      ? offer.priceCurrency
      : typeof node.priceCurrency === 'string'
        ? node.priceCurrency
        : undefined,
  );
  if (price === undefined || price <= 0 || !currency) {
    return undefined;
  }

  const name =
    (typeof node.name === 'string' && node.name.trim()) ||
    (typeof offer.name === 'string' && offer.name.trim()) ||
    undefined;

  return {
    name,
    price,
    currency,
    availability: mapAvailability(offer.availability),
    imageUrl: readImage(node.image ?? offer.image),
    scrapeMethod: 'jsonld',
  };
}

function pickOffer(value: unknown): JsonLdNode | undefined {
  if (Array.isArray(value)) {
    let best: JsonLdNode | undefined;
    let bestPrice = -Infinity;
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const node = item as JsonLdNode;
      const price = parsePrice(node.price ?? node.lowPrice);
      if (price === undefined || price <= 0) continue;
      if (price > bestPrice) {
        bestPrice = price;
        best = node;
      }
    }
    return best;
  }
  if (value && typeof value === 'object') {
    return value as JsonLdNode;
  }
  return undefined;
}

function parsePrice(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const cleaned = value.replace(/[^0-9.,-]/g, '').replace(/,/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizeCurrency(value?: string) {
  const trimmed = value?.trim().toUpperCase();
  if (!trimmed) return undefined;
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  return undefined;
}

function mapAvailability(value: unknown): Availability | undefined {
  if (typeof value !== 'string') return undefined;
  const lower = value.toLowerCase();
  if (lower.includes('instock') || lower.includes('in_stock')) {
    return 'IN_STOCK';
  }
  if (
    lower.includes('outofstock') ||
    lower.includes('out_of_stock') ||
    lower.includes('soldout')
  ) {
    return 'OUT_OF_STOCK';
  }
  return 'UNKNOWN';
}

function readImage(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.trim()) return item.trim();
      if (item && typeof item === 'object') {
        const url = (item as JsonLdNode).url;
        if (typeof url === 'string' && url.trim()) return url.trim();
      }
    }
  }
  if (value && typeof value === 'object') {
    const url = (value as JsonLdNode).url;
    if (typeof url === 'string' && url.trim()) return url.trim();
  }
  return undefined;
}
