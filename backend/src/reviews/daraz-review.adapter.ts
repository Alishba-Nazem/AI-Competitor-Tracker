import { Injectable } from '@nestjs/common';
import type { Page } from 'playwright';
import { fetchJson } from '../scraper/http';
import { withReviewContext } from './playwright-browser';
import type { ExtractedReview, ReviewScrapeResult } from './review.types';

const MAX_REVIEWS = 40;
const MAX_PAGES = 8;
const REVIEW_LIST_PAGE_SIZE = 20;
const LIST_API_CONCURRENCY = 6;
const MAX_BROWSER_FALLBACKS = 5;

export type DarazReviewPage = {
  items: Array<{ text: string; rating?: number; dateText: string }>;
  score?: string;
  ratingsCount?: number;
  hasNext: boolean;
};

export function parseDarazScore(scoreText?: string) {
  const match = scoreText?.match(/(\d+(?:\.\d+)?)\s*\/\s*5/);
  if (!match) return undefined;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : undefined;
}

export function parseDarazDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed || /verified/i.test(trimmed)) return undefined;
  const timestamp = Date.parse(trimmed);
  if (!Number.isFinite(timestamp)) return undefined;
  return new Date(timestamp);
}

export function canonicalizeProductUrl(url: string) {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.search = '';
    return parsed.toString();
  } catch {
    return url.split('?')[0];
  }
}

export function isDarazStarFilled(style: string, mask: string | null) {
  const gold = /255,\s*200,\s*60|#ffc83c/i.test(style);
  if (!gold) return false;
  if (mask && /half_0/.test(mask)) return false;
  return true;
}

export function clampDarazRating(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return Math.min(5, Math.max(1, Math.round(value)));
}

export function extractDarazItemId(url: string) {
  return url.match(/i(\d+)(?:\.html)?/i)?.[1];
}

type DarazReviewListPayload = {
  success?: boolean;
  model?: {
    items?: Array<{
      reviewRateId?: number | string;
      reviewContent?: string;
      rating?: number;
      reviewTime?: string;
      boughtDate?: string;
    }>;
    paging?: {
      totalItems?: number;
      totalPages?: number;
      currentPage?: number;
    };
    ratings?: {
      average?: number;
      reviewCount?: number;
      rateCount?: number;
    };
  };
};

export function parseDarazReviewList(payload: DarazReviewListPayload | undefined) {
  if (!payload?.success || !payload.model) {
    return undefined;
  }

  const reviews: ExtractedReview[] = [];
  for (const item of payload.model.items ?? []) {
    const text = item.reviewContent?.replace(/\s+/g, ' ').trim();
    if (!text) continue;
    reviews.push({
      text,
      rating: clampDarazRating(item.rating),
      reviewDate: parseDarazDate(item.reviewTime || item.boughtDate || ''),
      externalId:
        item.reviewRateId !== undefined
          ? String(item.reviewRateId)
          : undefined,
    });
  }

  const average = Number(payload.model.ratings?.average);
  const reviewCount = Number(
    payload.model.ratings?.reviewCount ??
      payload.model.ratings?.rateCount ??
      payload.model.paging?.totalItems,
  );

  return {
    available: true as const,
    source: 'DARAZ',
    averageRating: Number.isFinite(average) && average > 0 ? average : undefined,
    reviewCount: Number.isFinite(reviewCount) && reviewCount > 0 ? reviewCount : reviews.length,
    reviews,
    totalPages: payload.model.paging?.totalPages,
    currentPage: payload.model.paging?.currentPage,
  };
}

const COLLECT_PAGE_STATE = `(() => {
  const section = document.querySelector('.pdp-mod-review');
  const items = [...(section ? section.querySelectorAll('.mod-reviews .item') : [])].map((item) => {
    const text =
      item.querySelector('.item-content .content')?.textContent?.replace(/\\s+/g, ' ').trim() || '';
    const dateText = item.querySelector('.title.right')?.textContent?.trim() || '';
    const stars = [...item.querySelectorAll('.container-star .i-rate-star')].slice(0, 5);
    let rating = 0;
    for (const star of stars) {
      const gold = [...star.querySelectorAll('path')].find((path) =>
        /255,\\s*200,\\s*60|#ffc83c/i.test(path.getAttribute('style') || ''),
      );
      if (!gold) continue;
      const mask = gold.getAttribute('mask') || '';
      if (/half_0/.test(mask)) continue;
      rating += 1;
    }
    return { text, dateText, rating: rating > 0 ? rating : undefined };
  });
  const score = section?.querySelector('.score')?.textContent?.trim();
  const ratingsMatch = (section && section.innerText ? section.innerText : '').match(/(\\d[\\d,]*)\\s+Ratings/i);
  const next = section?.querySelector('.next-pagination button.next-pagination-item.next');
  return {
    items,
    score,
    ratingsCount: ratingsMatch ? Number(ratingsMatch[1].replace(/,/g, '')) : undefined,
    hasNext: Boolean(next && !next.disabled && !next.hasAttribute('disabled') && !next.classList.contains('next-disabled')),
  };
})()`;

function toDarazPage(value: unknown): DarazReviewPage {
  if (!value || typeof value !== 'object') {
    return { items: [], hasNext: false };
  }
  const record = value as {
    items?: Array<{ text?: unknown; rating?: unknown; dateText?: unknown }>;
    score?: unknown;
    ratingsCount?: unknown;
    hasNext?: unknown;
  };
  return {
    items: Array.isArray(record.items)
      ? record.items.map((item) => ({
          text: typeof item.text === 'string' ? item.text : '',
          rating: typeof item.rating === 'number' ? item.rating : undefined,
          dateText: typeof item.dateText === 'string' ? item.dateText : '',
        }))
      : [],
    score: typeof record.score === 'string' ? record.score : undefined,
    ratingsCount:
      typeof record.ratingsCount === 'number' ? record.ratingsCount : undefined,
    hasNext: Boolean(record.hasNext),
  };
}

function isCompleteReviewList(
  result: ReviewScrapeResult | undefined,
): result is ReviewScrapeResult {
  if (!result) return false;
  // A successful list payload (even with 0 written reviews) is complete.
  return result.available === true;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current]);
    }
  }

  const pool = Array.from(
    { length: Math.min(concurrency, Math.max(items.length, 1)) },
    () => runWorker(),
  );
  await Promise.all(pool);
  return results;
}

@Injectable()
export class DarazReviewAdapter {
  async scrape(productUrl: string): Promise<ReviewScrapeResult> {
    const url = canonicalizeProductUrl(productUrl);
    const fromList = await this.scrapeReviewList(url);
    if (isCompleteReviewList(fromList)) {
      return fromList;
    }
    return this.scrapeWithBrowser(url);
  }

  async scrapeMany(
    productUrls: string[],
  ): Promise<Array<{ url: string; result: ReviewScrapeResult }>> {
    const urls = productUrls.map((productUrl) =>
      canonicalizeProductUrl(productUrl),
    );

    const listResults = await mapPool(urls, LIST_API_CONCURRENCY, async (url) => {
      const fromList = await this.scrapeReviewList(url);
      return { url, fromList };
    });

    const packed: Array<{ url: string; result: ReviewScrapeResult }> = [];
    const fallbackUrls: string[] = [];

    for (const item of listResults) {
      if (isCompleteReviewList(item.fromList)) {
        packed.push({ url: item.url, result: item.fromList });
      } else {
        fallbackUrls.push(item.url);
      }
    }

    if (fallbackUrls.length === 0) {
      return packed;
    }

    // Browser scrapes are slow — only fall back for a small subset.
    const browserTargets = fallbackUrls.slice(0, MAX_BROWSER_FALLBACKS);
    const fromBrowser = await this.scrapeManyWithBrowser(browserTargets);
    packed.push(...fromBrowser);

    for (const url of fallbackUrls.slice(MAX_BROWSER_FALLBACKS)) {
      packed.push({
        url,
        result: {
          available: false,
          source: 'DARAZ',
          reason:
            'Review list API unavailable and browser fallback limit reached.',
          reviews: [],
        },
      });
    }

    return packed;
  }

  private async scrapeReviewList(
    productUrl: string,
  ): Promise<ReviewScrapeResult | undefined> {
    const itemId = extractDarazItemId(productUrl);
    if (!itemId) return undefined;

    const collected: ExtractedReview[] = [];
    const seen = new Set<string>();
    let averageRating: number | undefined;
    let reviewCount: number | undefined;
    let gotPayload = false;

    for (
      let pageNo = 1;
      pageNo <= MAX_PAGES && collected.length < MAX_REVIEWS;
      pageNo += 1
    ) {
      const payload = await this.fetchReviewListPage(itemId, pageNo, productUrl);
      const parsed = parseDarazReviewList(payload);
      if (!parsed) {
        return pageNo === 1
          ? undefined
          : this.toListResult(collected, averageRating, reviewCount);
      }
      gotPayload = true;

      averageRating = parsed.averageRating ?? averageRating;
      reviewCount = parsed.reviewCount ?? reviewCount;

      for (const review of parsed.reviews) {
        const key =
          review.externalId ??
          `${review.rating ?? ''}|${review.text.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push(review);
        if (collected.length >= MAX_REVIEWS) break;
      }

      if (!parsed.totalPages || pageNo >= parsed.totalPages) break;
    }

    if (!gotPayload) return undefined;
    return this.toListResult(collected, averageRating, reviewCount);
  }

  private async fetchReviewListPage(
    itemId: string,
    pageNo: number,
    productUrl: string,
  ) {
    const endpoints = [
      `https://my.daraz.pk/pdp/review/getReviewList?itemId=${encodeURIComponent(itemId)}&pageSize=${REVIEW_LIST_PAGE_SIZE}&pageNo=${pageNo}`,
      `https://www.daraz.pk/pdp/review/getReviewList?itemId=${encodeURIComponent(itemId)}&pageSize=${REVIEW_LIST_PAGE_SIZE}&pageNo=${pageNo}`,
    ];
    for (const endpoint of endpoints) {
      const payload = await fetchJson<DarazReviewListPayload>(endpoint, {
        Referer: productUrl,
      });
      if (payload?.success && payload.model) {
        return payload;
      }
    }
    return undefined;
  }

  private toListResult(
    reviews: ExtractedReview[],
    averageRating?: number,
    reviewCount?: number,
  ): ReviewScrapeResult {
    return {
      available: true,
      source: 'DARAZ',
      averageRating:
        averageRating && averageRating > 0 ? averageRating : undefined,
      reviewCount:
        reviewCount && reviewCount > 0 ? reviewCount : reviews.length,
      reviews,
    };
  }

  private async scrapeWithBrowser(url: string): Promise<ReviewScrapeResult> {
    return withReviewContext(async (context) => {
      const page = await context.newPage();
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
        return await this.scrapePage(page);
      } finally {
        await page.close();
      }
    });
  }

  private async scrapeManyWithBrowser(
    productUrls: string[],
  ): Promise<Array<{ url: string; result: ReviewScrapeResult }>> {
    return withReviewContext(async (context) => {
      const packed: Array<{ url: string; result: ReviewScrapeResult }> = [];
      for (const url of productUrls) {
        const page = await context.newPage();
        try {
          await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 25000,
          });
          packed.push({ url, result: await this.scrapePage(page) });
        } catch (error) {
          packed.push({
            url,
            result: {
              available: false,
              source: 'DARAZ',
              reason: error instanceof Error ? error.message : String(error),
              reviews: [],
            },
          });
        } finally {
          await page.close();
        }
      }
      return packed;
    });
  }

  private async scrapePage(page: Page): Promise<ReviewScrapeResult> {
    const ratingsLink = page.locator('a.pdp-review-summary__link').first();
    await ratingsLink.waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined);
    if (await ratingsLink.count()) {
      await ratingsLink.click({ timeout: 3000, force: true }).catch(() => undefined);
    }

    const reviewModule = page.locator('#module_product_review, .pdp-mod-review').first();
    if (await reviewModule.count()) {
      await reviewModule.scrollIntoViewIfNeeded().catch(() => undefined);
    }

    const section = page.locator('.pdp-mod-review').first();
    const appeared = await section
      .waitFor({ state: 'attached', timeout: 12000 })
      .then(() => true)
      .catch(() => false);
    if (!appeared) {
      return {
        available: false,
        source: 'DARAZ',
        reason: 'Daraz review section did not render.',
        reviews: [],
      };
    }

    await section.scrollIntoViewIfNeeded().catch(() => undefined);
    await this.selectAllStarFilter(page);
    await page
      .locator('.pdp-mod-review .mod-reviews .item')
      .first()
      .waitFor({ state: 'visible', timeout: 8000 })
      .catch(() => undefined);

    const collected: ExtractedReview[] = [];
    const seen = new Set<string>();
    let averageRating: number | undefined;
    let reviewCount: number | undefined;

    for (
      let pageNumber = 1;
      pageNumber <= MAX_PAGES && collected.length < MAX_REVIEWS;
      pageNumber += 1
    ) {
      const snapshot = toDarazPage(await page.evaluate(COLLECT_PAGE_STATE));
      averageRating = parseDarazScore(snapshot.score) ?? averageRating;
      reviewCount = snapshot.ratingsCount ?? reviewCount;

      for (const item of snapshot.items) {
        if (!item.text) continue;
        const rating = clampDarazRating(item.rating);
        const key = `${rating ?? ''}|${item.text.toLowerCase()}|${item.dateText}`;
        if (seen.has(key)) continue;
        seen.add(key);
        collected.push({
          text: item.text,
          rating,
          reviewDate: parseDarazDate(item.dateText),
        });
        if (collected.length >= MAX_REVIEWS) break;
      }

      if (!snapshot.hasNext || collected.length >= MAX_REVIEWS) break;

      const previous = snapshot.items[0]?.text ?? '';
      const clicked = await page
        .locator('.pdp-mod-review .next-pagination button.next-pagination-item.next')
        .click({ timeout: 3000 })
        .then(() => true)
        .catch(() => false);
      if (!clicked) break;

      await page
        .waitForFunction(
          (prev: string) => {
            const text = document
              .querySelector(
                '.pdp-mod-review .mod-reviews .item .item-content .content',
              )
              ?.textContent?.trim();
            return Boolean(text && text !== prev);
          },
          previous,
          { timeout: 5000 },
        )
        .catch(() => undefined);
    }

    return {
      available: true,
      source: 'DARAZ',
      averageRating:
        collected.length > 0 && averageRating && averageRating > 0
          ? averageRating
          : undefined,
      reviewCount:
        reviewCount && reviewCount > 0 ? reviewCount : collected.length,
      reviews: collected,
    };
  }

  private async selectAllStarFilter(page: Page) {
    const filter = page.locator('.pdp-mod-review').getByText('All star', { exact: false }).first();
    if (await filter.count()) {
      await filter.click({ timeout: 2000 }).catch(() => undefined);
    }
  }
}
