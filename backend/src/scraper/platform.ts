export type Platform = 'SHOPIFY' | 'DARAZ' | 'UNKNOWN';

export type Availability = 'IN_STOCK' | 'OUT_OF_STOCK' | 'UNKNOWN';

export type DiscoveredProduct = {
  name: string;
  url: string;
  externalId?: string;
  imageUrl?: string;
  availability?: Availability;
};

const SHOPIFY_SIGNALS =
  /(?:window\.Shopify|Shopify\.theme|Shopify\.shop|cdn\.shopify\.com|shopify-section|shopify-features|\/cart\/add)/i;

export function detectPlatform(url: string, html: string): Platform {
  let hostname = '';
  try {
    hostname = new URL(url).hostname.toLowerCase();
  } catch {
    hostname = '';
  }

  if (
    hostname.includes('daraz.') ||
    /"isDaraz"\s*:\s*true/.test(html) ||
    /"siteName"\s*:\s*"Daraz"/i.test(html)
  ) {
    return 'DARAZ';
  }

  if (
    hostname.endsWith('.myshopify.com') ||
    SHOPIFY_SIGNALS.test(html) ||
    /\/products\.json/i.test(html)
  ) {
    return 'SHOPIFY';
  }

  return 'UNKNOWN';
}

export function absoluteUrl(base: string, href: string) {
  try {
    return new URL(href, base).toString();
  } catch {
    return undefined;
  }
}
