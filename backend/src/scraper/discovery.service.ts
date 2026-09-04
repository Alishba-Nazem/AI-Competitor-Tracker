import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { discoverDarazProducts } from './daraz-discovery';
import {
  clipDbString,
  PRODUCT_EXTERNAL_ID_MAX_CHARS,
  PRODUCT_NAME_MAX_CHARS,
} from './db-string';
import { fetchHtml, fetchJson } from './http';
import { detectPlatform } from './platform';
import { discoverShopifyProducts } from './shopify-discovery';

@Injectable()
export class DiscoveryService {
  constructor(private readonly prisma: PrismaService) {}

  async discoverCompetitor(competitorId: number) {
    const competitor = await this.prisma.competitor.findUnique({
      where: { id: competitorId },
      include: { products: true },
    });
    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    let html: string;
    try {
      html = await fetchHtml(competitor.url);
    } catch (error) {
      throw new BadGatewayException({
        message:
          error instanceof Error
            ? error.message
            : 'STORE_UNREACHABLE: the store URL could not be fetched.',
        platform: 'UNKNOWN',
        discovered: 0,
        created: 0,
      });
    }

    let platform = detectPlatform(competitor.url, html);
    if (platform === 'UNKNOWN') {
      const origin = new URL(competitor.url).origin;
      const catalog = await fetchJson<{ products?: unknown[] }>(
        `${origin}/products.json?limit=1`,
      );
      if (Array.isArray(catalog?.products)) {
        platform = 'SHOPIFY';
      }
    }

    await this.prisma.competitor.update({
      where: { id: competitor.id },
      data: { platform },
    });

    if (platform === 'UNKNOWN') {
      throw new BadGatewayException({
        message:
          'UNSUPPORTED_PLATFORM: this store URL is not a detected Shopify or Daraz shop.',
        platform,
        discovered: 0,
        created: 0,
      });
    }

    const discovered =
      platform === 'SHOPIFY'
        ? await discoverShopifyProducts(competitor.url)
        : await discoverDarazProducts(competitor.url, html);

    if (discovered.length === 0) {
      throw new BadGatewayException({
        message:
          'NO_PRODUCTS_FOUND: no product URLs could be discovered from this store.',
        platform,
        discovered: 0,
        created: 0,
      });
    }

    const existingUrls = new Set(
      competitor.products.map((product) => product.url),
    );
    const seedCurrency = platform === 'DARAZ' ? 'PKR' : 'USD';
    let created = 0;

    for (const product of discovered) {
      if (existingUrls.has(product.url)) continue;
      await this.prisma.product.create({
        data: {
          competitorId: competitor.id,
          name: clipDbString(product.name, PRODUCT_NAME_MAX_CHARS),
          url: product.url,
          currentPrice: 0,
          currency: seedCurrency,
          externalId: product.externalId
            ? clipDbString(product.externalId, PRODUCT_EXTERNAL_ID_MAX_CHARS)
            : undefined,
          imageUrl: product.imageUrl,
          availability: product.availability,
        },
      });
      existingUrls.add(product.url);
      created += 1;
    }

    return {
      competitorId: competitor.id,
      platform,
      discovered: discovered.length,
      created,
      skipped: discovered.length - created,
      products: discovered,
    };
  }
}
