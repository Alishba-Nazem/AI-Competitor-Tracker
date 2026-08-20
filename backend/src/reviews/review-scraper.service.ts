import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { canonicalizeProductUrl, DarazReviewAdapter } from './daraz-review.adapter';
import { reviewFingerprint } from './fingerprint';
import { closeReviewBrowser } from './playwright-browser';
import type { ReviewScrapeResult } from './review.types';
import { ShopifyReviewAdapter } from './shopify-review.adapter';

const MAX_PRODUCTS_PER_COMPETITOR = 40;

@Injectable()
export class ReviewScraperService implements OnModuleDestroy {
  private readonly logger = new Logger(ReviewScraperService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly darazReviewAdapter: DarazReviewAdapter,
    private readonly shopifyReviewAdapter: ShopifyReviewAdapter,
  ) {}

  async onModuleDestroy() {
    await closeReviewBrowser();
  }

  async scrapeProduct(productId: number) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { competitor: true },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const platform =
      product.competitor.platform === 'DARAZ' || /\.daraz\./i.test(product.url)
        ? 'DARAZ'
        : 'SHOPIFY';
    let result: ReviewScrapeResult;

    try {
      if (platform === 'DARAZ') {
        result = await this.darazReviewAdapter.scrape(product.url);
      } else {
        result = await this.shopifyReviewAdapter.scrape(product.url);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Review scrape failed for product ${productId}: ${message}`,
      );
      result = {
        available: false,
        source: platform,
        reason: message,
        reviews: [],
      };
    }

    return {
      ...(await this.persistResult(product.id, platform, result)),
      averageRating: result.averageRating,
      reviewCount: result.reviewCount,
    };
  }

  async scrapeCompetitor(competitorId: number) {
    const competitor = await this.prisma.competitor.findUnique({
      where: { id: competitorId },
      include: {
        products: {
          orderBy: { id: 'asc' },
          take: MAX_PRODUCTS_PER_COMPETITOR,
        },
      },
    });
    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    const darazProducts = competitor.products.filter(
      (product) =>
        competitor.platform === 'DARAZ' || /\.daraz\./i.test(product.url),
    );
    const otherProducts = competitor.products.filter(
      (product) =>
        !(competitor.platform === 'DARAZ' || /\.daraz\./i.test(product.url)),
    );

    const results: Array<{
      productId: number;
      platform: string;
      available: boolean;
      source: string;
      reason?: string;
      extracted: number;
      created: number;
      skipped: number;
    }> = [];

    if (darazProducts.length > 0) {
      const scraped = await this.darazReviewAdapter.scrapeMany(
        darazProducts.map((product) => product.url),
      );
      for (const product of darazProducts) {
        const match = scraped.find(
          (item) =>
            canonicalizeProductUrl(item.url) ===
            canonicalizeProductUrl(product.url),
        );
        if (!match) {
          results.push(await this.scrapeProduct(product.id));
          continue;
        }
        results.push(await this.persistResult(product.id, 'DARAZ', match.result));
      }
    }

    for (const product of otherProducts) {
      try {
        results.push(await this.scrapeProduct(product.id));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(
          `Review extraction skipped for product ${product.id}: ${message}`,
        );
        results.push({
          productId: product.id,
          platform: competitor.platform ?? 'UNKNOWN',
          available: false,
          source: competitor.platform ?? 'UNKNOWN',
          reason: message,
          extracted: 0,
          created: 0,
          skipped: 0,
        });
      }
    }

    return {
      competitorId,
      processed: results.length,
      created: results.reduce((sum, item) => sum + item.created, 0),
      results,
    };
  }

  private async persistResult(
    productId: number,
    platform: string,
    result: ReviewScrapeResult,
  ) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.update({
      where: { id: product.id },
      data: {
        reviewsAvailable: result.available,
        reviewSource: result.source,
      },
    });

    const rows = result.reviews
      .filter((review) => review.text.trim().length > 0)
      .map((review) => ({
        productId: product.id,
        externalId:
          review.externalId ??
          reviewFingerprint({
            productId: product.id,
            text: review.text,
            rating: review.rating,
            reviewDate: review.reviewDate,
          }),
        rating: review.rating,
        text: review.text.trim(),
        reviewDate: review.reviewDate,
        source: result.source,
      }));

    const uniqueRows = new Map<string, (typeof rows)[number]>();
    for (const row of rows) {
      uniqueRows.set(row.externalId, row);
    }
    const data = [...uniqueRows.values()];

    let created = 0;
    if (data.length > 0) {
      const write = await this.prisma.review.createMany({
        data,
        skipDuplicates: true,
      });
      created = write.count;
    }

    return {
      productId: product.id,
      platform,
      available: result.available,
      source: result.source,
      reason: result.reason,
      extracted: data.length,
      created,
      skipped: data.length - created,
    };
  }
}
