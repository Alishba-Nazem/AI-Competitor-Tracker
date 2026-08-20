import {
  BadGatewayException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as cheerio from 'cheerio';
import { PrismaService } from '../prisma.service';
import {
  resolveDarazAvailability,
  resolveShopifyAvailability,
} from './availability';
import type { Availability } from './platform';
import { extractJsonLdProduct } from './jsonld-extractor';
import {
  bumpScrapeProgress,
  finishScrapeProgress,
  getScrapeProgress,
  startScrapeProgress,
} from './scrape-progress';

type ScrapedLink = {
  text: string;
  href: string;
};

type ExtractedPrice = {
  price: number;
  currency: string;
  title?: string;
  confidence?: number;
  source?: string;
  availability?: Availability;
  scrapeMethod?: 'daraz' | 'shopify' | 'jsonld';
  imageUrl?: string;
};

type PriceCandidate = {
  price: number;
  currency?: string;
  confidence: number;
  source: string;
};

type ShopifyVariant = {
  id?: number | string;
  available?: boolean;
  price?: number | string;
  compare_at_price?: number | string | null;
};

type ShopifyProduct = {
  title?: string;
  currency?: string;
  variants?: ShopifyVariant[];
};

type DarazSkuInfo = {
  skuId?: string;
  price?: unknown;
  salePrice?: unknown;
  operation?: { disable?: boolean };
};

type DarazModuleFields = {
  product?: { title?: string };
  globalConfig?: { currency?: string; isDaraz?: boolean; siteName?: string };
  tracking?: {
    pdt_price?: string;
    pdt_discount_price?: string;
    pdt_original_price?: string;
    pdt_name?: string;
    core?: { currencyCode?: string };
  };
  primaryKey?: {
    skuId?: string;
    defaultSkuId?: string;
    itemId?: string;
  };
  skuInfos?: Record<string, DarazSkuInfo>;
};

@Injectable()
export class ScraperService {
  constructor(private readonly prisma: PrismaService) {}

  async scrapeUrl(url: string) {
    const html = await this.fetchHtml(url);
    const $ = cheerio.load(html);

    const title = $('title').first().text().trim();
    const description =
      $('meta[name="description"]').attr('content')?.trim() ?? '';
    const headings = $('h1, h2, h3')
      .map((_, element) => $(element).text().trim())
      .get()
      .filter(Boolean);
    const links: ScrapedLink[] = $('a[href]')
      .map((_, element) => ({
        text: $(element).text().trim(),
        href: $(element).attr('href') ?? '',
      }))
      .get()
      .filter((link) => link.href);

    return { url, title, description, headings, links };
  }

  getProgress(competitorId: number) {
    return getScrapeProgress(competitorId);
  }

  async scrapeCompetitor(
    competitorId: number,
    options: { triggeredBy?: 'cron' | 'manual' } = {},
  ) {
    const triggeredBy = options.triggeredBy ?? 'manual';
    const competitor = await this.prisma.competitor.findUnique({
      where: { id: competitorId },
      include: { products: true },
    });

    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    const captureLog = await this.prisma.captureLog.create({
      data: {
        competitorId: competitor.id,
        triggeredBy,
        startedAt: new Date(),
        status: 'failed',
        productsScraped: 0,
        reviewsScraped: 0,
      },
    });

    startScrapeProgress(competitor.id, competitor.products.length);

    type CaptureSuccess = {
      product: (typeof competitor.products)[number];
      price: number;
      currency: string;
      name: string;
      availability: Availability;
      scrapeMethod: 'daraz' | 'shopify' | 'jsonld';
      imageUrl?: string;
    };
    type CaptureFailure = {
      product: (typeof competitor.products)[number];
      error: string;
    };

    const results: Array<CaptureSuccess | CaptureFailure> = [];
    const concurrency = 4;
    try {
      for (
        let index = 0;
        index < competitor.products.length;
        index += concurrency
      ) {
        const batch = competitor.products.slice(index, index + concurrency);
        const batchResults = await Promise.all(
          batch.map(
            async (product): Promise<CaptureSuccess | CaptureFailure> => {
              try {
                const extractedPrice = await this.extractPriceForProduct(
                  product.url,
                );

                if (!extractedPrice?.scrapeMethod) {
                  await this.prisma.product.update({
                    where: { id: product.id },
                    data: { scrapeMethod: 'unsupported' },
                  });
                  throw new Error(
                    'PRICE_NOT_FOUND: no trustworthy purchase price available (platform scrapers and JSON-LD failed).',
                  );
                }

                return {
                  product,
                  price: extractedPrice.price,
                  currency: extractedPrice.currency,
                  name: extractedPrice.title ?? product.name,
                  availability: extractedPrice.availability ?? 'UNKNOWN',
                  scrapeMethod: extractedPrice.scrapeMethod,
                  imageUrl: extractedPrice.imageUrl,
                };
              } catch (error) {
                return {
                  product,
                  error:
                    error instanceof Error
                      ? error.message
                      : 'Unable to scrape product.',
                };
              } finally {
                bumpScrapeProgress(competitor.id, 1);
              }
            },
          ),
        );
        results.push(...batchResults);
      }

      const capturedProducts = results.filter(
        (result): result is CaptureSuccess => 'price' in result,
      );
      const failedProducts = results
        .filter((result): result is CaptureFailure => 'error' in result)
        .map(({ product, error }) => ({
          productId: product.id,
          name: product.name,
          error,
        }));

      if (capturedProducts.length === 0) {
        await this.prisma.captureLog.update({
          where: { id: captureLog.id },
          data: {
            completedAt: new Date(),
            status: 'failed',
            productsScraped: 0,
            message: 'No product prices could be captured.',
          },
        });
        throw new BadGatewayException({
          message:
            'PRICE_NOT_FOUND: No product prices could be captured for this competitor.',
          failedProducts,
        });
      }

      const status =
        failedProducts.length === 0
          ? 'success'
          : capturedProducts.length > 0
            ? 'partial'
            : 'failed';

      const snapshot = await this.prisma.$transaction(
        async (transaction) => {
          const createdSnapshot = await transaction.snapshot.create({
            data: { competitorId: competitor.id },
          });

          for (const {
            product,
            price,
            currency,
            name,
            availability,
            scrapeMethod,
            imageUrl,
          } of capturedProducts) {
            await transaction.product.update({
              where: { id: product.id },
              data: {
                name,
                currentPrice: price,
                currency,
                availability,
                scrapeMethod,
                ...(imageUrl ? { imageUrl } : {}),
              },
            });
          }

          await transaction.snapshotProduct.createMany({
            data: capturedProducts.map(
              ({ product, price, currency, name, availability }) => ({
                snapshotId: createdSnapshot.id,
                productId: product.id,
                name,
                url: product.url,
                price,
                currency,
                availability,
              }),
            ),
          });

          await transaction.competitor.update({
            where: { id: competitor.id },
            data: { lastCapturedAt: new Date() },
          });

          await transaction.captureLog.update({
            where: { id: captureLog.id },
            data: {
              completedAt: new Date(),
              status,
              productsScraped: capturedProducts.length,
              message:
                failedProducts.length > 0
                  ? `${failedProducts.length} product(s) failed to capture.`
                  : null,
            },
          });

          return createdSnapshot;
        },
        { timeout: 30000 },
      );

      return {
        snapshot,
        competitor: {
          id: competitor.id,
          name: competitor.name,
          url: competitor.url,
        },
        capturedProducts: capturedProducts.map(
          ({ product, price, currency, name, availability, scrapeMethod }) => ({
            productId: product.id,
            name,
            price,
            currency,
            availability,
            scrapeMethod,
          }),
        ),
        failedProducts,
        captureLogId: captureLog.id,
        status,
      };
    } catch (error) {
      if (!(error instanceof BadGatewayException)) {
        await this.prisma.captureLog.update({
          where: { id: captureLog.id },
          data: {
            completedAt: new Date(),
            status: 'failed',
            message: error instanceof Error ? error.message : String(error),
          },
        });
      }
      throw error;
    } finally {
      finishScrapeProgress(competitor.id);
    }
  }

  private async extractPriceForProduct(
    url: string,
  ): Promise<ExtractedPrice | undefined> {
    const html = await this.fetchHtml(url);

    if (this.isShopifyProductPage(html)) {
      const shopify = await this.extractShopifyProduct(url, html);
      if (shopify) {
        return { ...shopify, scrapeMethod: 'shopify' };
      }
    }

    if (this.isDarazProductPage(html)) {
      const daraz = this.extractDarazProduct(html);
      if (daraz) {
        return { ...daraz, scrapeMethod: 'daraz' };
      }
    }

    const jsonLd = extractJsonLdProduct(html);
    if (jsonLd) {
      return {
        title: jsonLd.name,
        price: jsonLd.price,
        currency: jsonLd.currency,
        availability: jsonLd.availability,
        imageUrl: jsonLd.imageUrl,
        confidence: 90,
        source: 'JSON_LD',
        scrapeMethod: 'jsonld',
      };
    }

    return undefined;
  }

  /**
   * Shopify stores commonly expose a public /products/<handle>.js endpoint. We only
   * use it after confirming Shopify signals in the rendered product page, rather
   * than guessing from a hostname or URL shape alone.
   */
  private async extractShopifyProduct(
    productUrl: string,
    html: string,
  ): Promise<ExtractedPrice | undefined> {
    const endpoint = this.getShopifyProductJsonUrl(productUrl);
    if (!endpoint) {
      return undefined;
    }

    const product = await this.fetchJson<ShopifyProduct>(endpoint);
    if (
      !product ||
      typeof product.title !== 'string' ||
      !Array.isArray(product.variants)
    ) {
      return undefined;
    }

    const variant =
      this.selectShopifyVariant(product.variants, productUrl) ??
      this.selectShopifyOutOfStockPriceVariant(product.variants);
    const cents = variant && this.toShopifyCents(variant.price);
    const currency =
      this.normalizeCurrency(product.currency) ??
      this.extractShopifyCurrency(html) ??
      (await this.fetchShopifyCartCurrency(productUrl));

    if (!variant || cents === undefined || cents <= 0 || !currency) {
      return undefined;
    }

    // Shopify's `price` is the present selling price in integer minor units.
    // `compare_at_price` is intentionally ignored because it is an original/list price.
    return {
      title: product.title.trim(),
      price: cents / 100,
      currency,
      confidence: 100,
      source: 'SHOPIFY_PRODUCT_JSON',
      availability: resolveShopifyAvailability(
        product.variants,
        this.getRequestedVariantId(productUrl),
      ),
    };
  }

  private isShopifyProductPage(html: string) {
    return /(?:window\.Shopify|Shopify\.theme|Shopify\.shop|cdn\.shopify\.com|shopify-section|shopify-features|\/cart\/add)/i.test(
      html,
    );
  }

  /**
   * Daraz PDP HTML embeds `var __moduleData__ = {...}` with the selected SKU's
   * selling price in `tracking.pdt_price` and ISO currency in `globalConfig` /
   * `tracking.core`. JSON-LD offers and the visible price DOM are empty in SSR;
   * the mtop detail API requires anti-bot tokens and is not used.
   */
  private extractDarazProduct(html: string): ExtractedPrice | undefined {
    const fields = this.parseDarazModuleFields(html);
    if (!fields) {
      return undefined;
    }

    const skuId = fields.primaryKey?.skuId ?? fields.primaryKey?.defaultSkuId;
    const sku = skuId ? fields.skuInfos?.[skuId] : undefined;
    const skuPrices = this.readDarazSkuPriceParts(sku);
    const trackingSale = this.parseDarazPriceText(
      fields.tracking?.pdt_discount_price,
    );
    const trackingList = this.parseDarazPriceText(fields.tracking?.pdt_price);
    const visibleSale = this.readDarazVisibleSellingPrice(html);
    const price =
      skuPrices.sale ??
      trackingSale ??
      visibleSale ??
      trackingList ??
      skuPrices.original;
    const currency =
      this.normalizeCurrency(fields.globalConfig?.currency) ??
      this.normalizeCurrency(fields.tracking?.core?.currencyCode);
    const title = (fields.product?.title ?? fields.tracking?.pdt_name)?.trim();

    if (price === undefined || price <= 0 || !currency) {
      return undefined;
    }

    return {
      title: title || undefined,
      price,
      currency,
      confidence: 100,
      source: 'DARAZ_MODULE_DATA',
      availability: resolveDarazAvailability(sku),
    };
  }

  private isDarazProductPage(html: string) {
    // Prefer explicit Daraz module flags from live SSR rather than hostname guessing.
    return (
      /"isDaraz"\s*:\s*true/.test(html) ||
      /"siteName"\s*:\s*"Daraz"/i.test(html)
    );
  }

  private parseDarazModuleFields(html: string): DarazModuleFields | undefined {
    const marker = 'var __moduleData__ = ';
    const start = html.indexOf(marker);
    if (start < 0) {
      return undefined;
    }

    const jsonStart = start + marker.length;
    let depth = 0;
    let inString = false;
    let escaped = false;
    let end = -1;

    for (let index = jsonStart; index < html.length; index += 1) {
      const char = html[index];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }
        if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === '{') {
        depth += 1;
      } else if (char === '}') {
        depth -= 1;
        if (depth === 0) {
          end = index;
          break;
        }
      }
    }

    if (end < 0) {
      return undefined;
    }

    try {
      const parsed = JSON.parse(html.slice(jsonStart, end + 1)) as {
        data?: { root?: { fields?: DarazModuleFields } };
      };
      return parsed.data?.root?.fields;
    } catch {
      return undefined;
    }
  }

  private readDarazSkuPriceParts(sku: DarazSkuInfo | undefined) {
    if (!sku) {
      return { sale: undefined as number | undefined, original: undefined as number | undefined };
    }

    const nested =
      sku.price && typeof sku.price === 'object'
        ? (sku.price as Record<string, unknown>)
        : undefined;
    const nestedSale =
      nested &&
      (this.readDarazNumericPrice(nested.salePrice) ??
        this.readDarazNumericPrice(
          nested.salePrice && typeof nested.salePrice === 'object'
            ? (nested.salePrice as Record<string, unknown>).text
            : undefined,
        ) ??
        this.readDarazNumericPrice(nested.salePriceString) ??
        this.readDarazNumericPrice(nested.discountPrice));

    return {
      sale:
        this.readDarazNumericPrice(sku.salePrice) ??
        nestedSale ??
        undefined,
      original:
        this.readDarazNumericPrice(nested?.originalPrice) ??
        this.readDarazNumericPrice(nested?.priceText) ??
        (nested ? undefined : this.readDarazNumericPrice(sku.price)),
    };
  }

  private readDarazVisibleSellingPrice(html: string) {
    const $ = cheerio.load(html);
    const scope = $(
      '#module_product_price, .pdp-product-price, .pdp-mod-product-price',
    ).first();
    const root = scope.length > 0 ? scope : $('body');
    const saleText = root
      .find('[class*="pdp-price"]')
      .filter((_, element) => {
        const className = ($(element).attr('class') ?? '').toLowerCase();
        return !/origin|save|was|delete/.test(className);
      })
      .first()
      .text();
    const sale = this.parseDarazPriceText(saleText);
    if (sale !== undefined) {
      return sale;
    }

    if (scope.length === 0) {
      return undefined;
    }

    const amounts = [
      ...new Set(
        root
          .text()
          .match(/Rs\.?\s*[\d,]+(?:\.\d{1,2})?/gi)
          ?.map((item) => this.parseDarazPriceText(item))
          .filter((value): value is number => value !== undefined) ?? [],
      ),
    ];
    if (amounts.length >= 2 && /-\s*\d+\s*%/.test(root.text())) {
      return Math.min(...amounts);
    }
    return amounts[0];
  }

  private readDarazNumericPrice(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value;
    }
    if (typeof value === 'string') {
      return this.parseDarazPriceText(value);
    }
    return undefined;
  }

  private parseDarazPriceText(value: unknown) {
    if (typeof value !== 'string') {
      return undefined;
    }

    const normalized = value.replace(/,/g, '').trim();
    // Prefer "Rs. 101,999" / "PKR 101999" style selling-price strings from tracking.
    const match = normalized.match(/(?:Rs\.?|PKR|৳)?\s*(\d+(?:\.\d{1,2})?)/i);
    if (!match) {
      return undefined;
    }

    const price = Number(match[1]);
    return Number.isFinite(price) && price > 0 ? price : undefined;
  }

  private getShopifyProductJsonUrl(productUrl: string) {
    try {
      const url = new URL(productUrl);
      const match = url.pathname.match(/^(.*\/products\/[^/]+)(?:\/)?$/i);
      if (!match) return undefined;
      return `${url.origin}${match[1]}.js`;
    } catch {
      return undefined;
    }
  }

  private selectShopifyVariant(variants: ShopifyVariant[], productUrl: string) {
    const requestedVariantId = this.getRequestedVariantId(productUrl);

    if (requestedVariantId) {
      return variants.find(
        (variant) =>
          String(variant.id) === requestedVariantId &&
          variant.available === true,
      );
    }

    // MVP rule: absent an explicit ?variant= id, Shopify returns variants in the
    // merchant-configured product order. The first available item is the product's
    // default purchasable variant; this deterministic rule never picks a random price.
    return variants.find((variant) => variant.available === true);
  }

  private selectShopifyOutOfStockPriceVariant(variants: ShopifyVariant[]) {
    if (
      variants.length === 0 ||
      !variants.every((variant) => variant.available === false)
    ) {
      return undefined;
    }
    return variants.find((variant) => {
      const cents = this.toShopifyCents(variant.price);
      return cents !== undefined && cents > 0;
    });
  }

  private getRequestedVariantId(productUrl: string) {
    try {
      return new URL(productUrl).searchParams.get('variant') ?? undefined;
    } catch {
      return undefined;
    }
  }

  private toShopifyCents(value: unknown) {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0)
      return value;
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
    return undefined;
  }

  private extractShopifyCurrency(html: string) {
    const patterns = [
      /"currency"\s*:\s*"([A-Za-z]{3})"/i,
      /\bcurrency\s*:\s*["']([A-Za-z]{3})["']/i,
      /Shopify\.currency\.active\s*=\s*["']([A-Za-z]{3})["']/i,
      /<meta[^>]+(?:property|name)=["'](?:product:price:currency|og:price:currency)["'][^>]+content=["']([A-Za-z]{3})["']/i,
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      const currency = this.normalizeCurrency(match?.[1]);
      if (currency) return currency;
    }
    return undefined;
  }

  private async fetchShopifyCartCurrency(productUrl: string) {
    try {
      const url = new URL(productUrl);
      const cart = await this.fetchJson<{ currency?: string }>(
        `${url.origin}/cart.js`,
      );
      return this.normalizeCurrency(cart?.currency);
    } catch {
      return undefined;
    }
  }

  private async fetchJson<T>(url: string): Promise<T | undefined> {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'Mozilla/5.0 (compatible; CompetitorTracker/1.0)',
        },
      });
      if (!response.ok) return undefined;
      return (await response.json()) as T;
    } catch {
      return undefined;
    }
  }

  private async fetchHtml(url: string) {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/151.0.0.0 Safari/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch website. Status: ${response.status}`);
    }

    return response.text();
  }

  private extractProductPrice(html: string): ExtractedPrice | undefined {
    const $ = cheerio.load(html);
    const candidates: PriceCandidate[] = [
      ...this.extractJsonLdPriceCandidates($),
      ...this.extractMetaPriceCandidates($),
      ...this.extractTrustedDomPriceCandidates($),
    ];

    if (candidates.length === 0) {
      return undefined;
    }

    const best = candidates.sort(
      (a, b) => b.confidence - a.confidence || b.price - a.price,
    )[0];
    if (best.confidence < 60 || !best.currency) {
      return undefined;
    }

    return {
      price: best.price,
      currency: best.currency,
      confidence: best.confidence,
      source: best.source,
    };
  }

  private extractMetaPriceCandidates($: cheerio.CheerioAPI): PriceCandidate[] {
    const candidates: PriceCandidate[] = [];
    const metaNodes = $(
      'meta[property="product:price:amount"], meta[itemprop="price"], meta[property="product:price:currency"], meta[itemprop="priceCurrency"], meta[property="og:price:amount"], meta[property="og:price:currency"], meta[property="product:price"]',
    ).toArray();

    for (const node of metaNodes) {
      const property = $(node).attr('property');
      const itemprop = $(node).attr('itemprop');
      const content = $(node).attr('content');
      if (!content) continue;

      const isAmount =
        /price|amount/i.test(property ?? '') || itemprop === 'price';
      const isCurrency =
        /currency/i.test(property ?? '') || itemprop === 'priceCurrency';

      if (isAmount) {
        const parsed = this.parsePrice(content);
        if (parsed !== undefined && !this.isSuspiciousPriceText(content)) {
          const currency = this.normalizeCurrency(
            $(
              'meta[property="product:price:currency"], meta[itemprop="priceCurrency"], meta[property="og:price:currency"]',
            )
              .first()
              .attr('content'),
          );
          candidates.push({
            price: parsed,
            currency,
            confidence: 95,
            source: 'PRODUCT_META',
          });
        }
      } else if (isCurrency) {
        const currency = this.normalizeCurrency(content);
        if (currency && candidates.length > 0) {
          const last = candidates[candidates.length - 1];
          last.currency = currency;
        }
      }
    }

    return candidates;
  }

  private extractTrustedDomPriceCandidates(
    $: cheerio.CheerioAPI,
  ): PriceCandidate[] {
    const selectors = [
      '[itemprop="price"]',
      '[data-product-price]',
      '[data-price]',
      '[data-testid*="price" i]',
      '[data-testid*="amount" i]',
      '[class*="product-price" i]',
      '[class*="offer-price" i]',
    ];

    const candidates: PriceCandidate[] = [];

    for (const selector of selectors) {
      $(selector).each((_, element) => {
        const rawText = this.cleanPriceText(
          $(element).attr('content') ??
            $(element).attr('data-price') ??
            $(element).text() ??
            '',
        );
        if (!rawText || this.isSuspiciousPriceText(rawText)) {
          return;
        }

        const numbers = this.extractNumberCandidates(rawText);
        if (numbers.length === 0) {
          return;
        }

        const trusted = this.isTrustedPurchaseContext(
          $,
          element,
          selector,
          rawText,
        );
        if (!trusted) {
          return;
        }

        const price = numbers[0];
        candidates.push({
          price,
          currency: this.inferCurrencyFromText(rawText),
          confidence: 75,
          source: 'TRUSTED_PRODUCT_DOM',
        });
      });
    }

    return candidates;
  }

  private isTrustedPurchaseContext(
    $: cheerio.CheerioAPI,
    element: any,
    selector: string,
    rawText: string,
  ): boolean {
    const className = ($(element).attr('class') ?? '').toLowerCase();
    const idName = ($(element).attr('id') ?? '').toLowerCase();
    const itemprop = ($(element).attr('itemprop') ?? '').toLowerCase();
    const text = rawText.toLowerCase();

    if (this.isSuspiciousPriceText(rawText)) {
      return false;
    }

    if (this.isLegitimatePurchasePriceText(rawText)) {
      return true;
    }

    if (
      itemprop === 'price' ||
      $(element).attr('data-product-price') ||
      $(element).attr('data-price')
    ) {
      return !/(monthly|installment|trade[- ]?in|credit|lease|subscription|save|promo|offer|cart)/i.test(
        text,
      );
    }

    if (
      selector.includes('product-price') ||
      selector.includes('offer-price')
    ) {
      return !/(monthly|installment|trade[- ]?in|credit|lease|subscription|save|promo|offer|cart)/i.test(
        text,
      );
    }

    if (className.includes('price') || idName.includes('price')) {
      return !/(monthly|installment|trade[- ]?in|credit|lease|subscription|save|promo|offer|cart)/i.test(
        text,
      );
    }

    return false;
  }

  private inferCurrencyFromText(value: string): string | undefined {
    const normalized = value.toLowerCase();
    if (normalized.includes('$')) return 'USD';
    if (normalized.includes('€')) return 'EUR';
    if (normalized.includes('£')) return 'GBP';
    return undefined;
  }

  private extractJsonLdPriceCandidates(
    $: cheerio.CheerioAPI,
  ): PriceCandidate[] {
    const candidates: PriceCandidate[] = [];

    for (const script of $('script[type="application/ld+json"]').toArray()) {
      try {
        const jsonText =
          (script as { children?: Array<{ data?: string }> }).children?.[0]
            ?.data ?? '';
        const parsed = JSON.parse(jsonText);
        this.walkJsonLdForOffers(parsed, candidates);
      } catch {
        continue;
      }
    }

    return candidates;
  }

  private walkJsonLdForOffers(value: unknown, candidates: PriceCandidate[]) {
    if (Array.isArray(value)) {
      for (const item of value) {
        this.walkJsonLdForOffers(item, candidates);
      }
      return;
    }

    if (!value || typeof value !== 'object') {
      return;
    }

    const record = value as Record<string, unknown>;
    const rawType = record['@type'];
    const types = Array.isArray(rawType) ? rawType : rawType ? [rawType] : [];
    const normalizedTypes = types.map((entry) => String(entry).toLowerCase());
    const isOfferOrProduct = normalizedTypes.some((type) =>
      /offer|aggregateoffer|product/.test(type),
    );

    if (isOfferOrProduct) {
      const priceValue =
        record.price ??
        record.lowPrice ??
        record.highPrice ??
        record.amount ??
        record.value;
      const price = this.parsePrice(priceValue);
      const textContext = this.cleanPriceText(
        [
          String(record.name ?? ''),
          String(record.description ?? ''),
          String(record.price ?? ''),
          String(record.priceCurrency ?? ''),
          String(record.currency ?? ''),
        ].join(' '),
      );

      if (price !== undefined && !this.isSuspiciousPriceText(textContext)) {
        const confidence = normalizedTypes.includes('product') ? 95 : 88;
        candidates.push({
          price,
          currency: this.normalizeCurrency(
            record.priceCurrency ?? record.currency,
          ),
          confidence,
          source: 'JSON_LD_OFFER',
        });
      }
    }

    for (const nestedValue of Object.values(record)) {
      this.walkJsonLdForOffers(nestedValue, candidates);
    }
  }

  private cleanPriceText(value: string): string {
    return value
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\u00A0/g, ' ')
      .trim();
  }

  private isLegitimatePurchasePriceText(value: string): boolean {
    const normalized = value.trim();
    return /^(from|starting at)\s+\$?\d+(?:\.\d{1,2})?$/i.test(normalized);
  }

  private isSuspiciousPriceText(value: string): boolean {
    const normalized = value.toLowerCase();
    if (this.isLegitimatePurchasePriceText(value)) {
      return false;
    }

    return /(monthly|month|per month|per week|financ|installment|bill credit|trade[- ]?in|carrier|special deal|credit|down payment|deposit|lease|subscription|shipping|tax|savings|discount|promo|promotion|offer|offering|offers|save|monthly payment|available on finance|with trade[- ]?in|\/mo\b|mo\.|\/wk\b|week)/i.test(
      normalized,
    );
  }

  private extractNumberCandidates(text: string): number[] {
    const matches = text.match(/\$?\d+(?:\.\d{1,2})?/g) ?? [];
    return matches
      .map((match) => Number(match.replace(/[$,]/g, '')))
      .filter((value) => Number.isFinite(value) && value > 0);
  }

  private findOffer(value: unknown): ExtractedPrice | undefined {
    if (Array.isArray(value)) {
      let highestPrice: ExtractedPrice | undefined;

      for (const item of value) {
        const price = this.findOffer(item);
        if (price && (!highestPrice || price.price > highestPrice.price)) {
          highestPrice = price;
        }
      }

      return highestPrice;
    }

    if (!value || typeof value !== 'object') return undefined;
    const record = value as Record<string, unknown>;
    const type = record['@type'];
    const isOffer =
      type === 'Offer' || (Array.isArray(type) && type.includes('Offer'));
    const isProduct =
      type === 'Product' || (Array.isArray(type) && type.includes('Product'));
    const textContext = this.cleanPriceText(
      [
        String(record.name ?? ''),
        String(record.description ?? ''),
        String(record.price ?? ''),
        String(record.priceCurrency ?? ''),
      ].join(' '),
    );
    const price =
      isOffer || isProduct ? this.parsePrice(record.price) : undefined;

    const currency = this.normalizeCurrency(record.priceCurrency);
    if (
      price !== undefined &&
      currency &&
      !this.isSuspiciousPriceText(textContext)
    ) {
      return {
        price,
        currency,
        confidence: isProduct ? 95 : 88,
        source: 'JSON_LD_OFFER',
      };
    }

    let highestPrice: ExtractedPrice | undefined;

    for (const nestedValue of Object.values(record)) {
      const found = this.findOffer(nestedValue);
      if (found && (!highestPrice || found.price > highestPrice.price)) {
        highestPrice = found;
      }
    }

    return highestPrice;
  }

  private parsePrice(value: unknown) {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0)
      return value;
    if (typeof value !== 'string') return undefined;

    const match = value.replace(/,/g, '').match(/\d+(?:\.\d{1,2})?/);
    if (!match) return undefined;

    const price = Number(match[0]);
    return Number.isFinite(price) ? price : undefined;
  }

  private normalizeCurrency(value: unknown) {
    if (typeof value !== 'string') return undefined;
    const currency = value.trim().toUpperCase();
    return /^[A-Z]{3}$/.test(currency) ? currency : undefined;
  }
}
