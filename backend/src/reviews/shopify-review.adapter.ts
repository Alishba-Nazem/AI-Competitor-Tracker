import { Injectable } from '@nestjs/common';
import { fetchHtml } from '../scraper/http';
import type { ReviewScrapeResult } from './review.types';

export type ShopifyReviewProvider =
  | 'OKENDO'
  | 'YOTPO'
  | 'JUDGE_ME'
  | 'LOOX'
  | 'SHOPIFY_PRODUCT_REVIEWS'
  | 'UNKNOWN';

export function detectShopifyReviewProvider(
  html: string,
): ShopifyReviewProvider {
  if (
    /okendo\.io|okendo-reviews|subscriberId/i.test(html) &&
    /okendo/i.test(html)
  ) {
    return 'OKENDO';
  }
  if (/judge\.me|judgeme/i.test(html)) return 'JUDGE_ME';
  if (/cdn\.loox\.io|loox\.io/i.test(html)) return 'LOOX';
  if (/shopify-product-reviews|spr-container/i.test(html))
    return 'SHOPIFY_PRODUCT_REVIEWS';
  if (/yotpo/i.test(html)) return 'YOTPO';
  return 'UNKNOWN';
}

@Injectable()
export class ShopifyReviewAdapter {
  async scrape(productUrl: string): Promise<ReviewScrapeResult> {
    let html = '';
    try {
      html = await fetchHtml(productUrl);
    } catch {
      return {
        available: false,
        source: 'SHOPIFY',
        reason: 'The Shopify product page could not be fetched.',
        reviews: [],
      };
    }

    const provider = detectShopifyReviewProvider(html);
    if (provider === 'UNKNOWN') {
      return {
        available: false,
        source: 'SHOPIFY',
        reason:
          'No public Shopify review app was detected on this product page.',
        reviews: [],
      };
    }

    return {
      available: false,
      source: `SHOPIFY_${provider}`,
      reason: `This store uses ${provider.replace(/_/g, ' ')}, which is not in Shopify’s core product API. Public review text was not extractable from server-rendered HTML.`,
      reviews: [],
    };
  }
}
