import { BadGatewayException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { ScraperService } from './scraper.service';

describe('ScraperService', () => {
  let service: ScraperService;
  const transaction = {
    snapshot: { create: jest.fn() },
    product: { update: jest.fn() },
    snapshotProduct: { createMany: jest.fn() },
    competitor: { update: jest.fn() },
    captureLog: { update: jest.fn() },
  };
  const prisma = {
    competitor: { findUnique: jest.fn(), update: jest.fn() },
    product: { update: jest.fn() },
    captureLog: { create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.captureLog.create.mockResolvedValue({ id: 900 });
    prisma.captureLog.update.mockResolvedValue({});
    prisma.product.update.mockResolvedValue({});
    transaction.competitor.update.mockResolvedValue({});
    transaction.captureLog.update.mockResolvedValue({});
    const module: TestingModule = await Test.createTestingModule({
      providers: [ScraperService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ScraperService>(ScraperService);
  });

  it('captures a structured product price and persists it with its snapshot', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 7,
      name: 'Example Store',
      url: 'https://example.com',
      products: [
        {
          id: 11,
          name: 'Running Shoe',
          url: 'https://example.com/shoe',
          currentPrice: 99,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 42, competitorId: 7 });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<script type="application/ld+json">{"@type":"Product","offers":{"@type":"Offer","price":"84.95","priceCurrency":"USD"}}</script>',
    });

    const result = await service.scrapeCompetitor(7);

    expect(result.capturedProducts).toEqual([
      {
        productId: 11,
        name: 'Running Shoe',
        price: 84.95,
        currency: 'USD',
        availability: 'UNKNOWN',
        scrapeMethod: 'jsonld',
      },
    ]);
    expect(transaction.product.update).toHaveBeenCalledWith({
      where: { id: 11 },
      data: {
        name: 'Running Shoe',
        currentPrice: 84.95,
        currency: 'USD',
        availability: 'UNKNOWN',
        scrapeMethod: 'jsonld',
      },
    });
    expect(transaction.snapshotProduct.createMany).toHaveBeenCalledWith({
      data: [
        {
          snapshotId: 42,
          productId: 11,
          name: 'Running Shoe',
          url: 'https://example.com/shoe',
          price: 84.95,
          currency: 'USD',
          availability: 'UNKNOWN',
        },
      ],
    });
  });

  it('prefers the real product offer over financing or monthly pricing values', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 7,
      name: 'Apple Demo',
      url: 'https://www.apple.com',
      products: [
        {
          id: 12,
          name: 'iPhone 15',
          url: 'https://www.apple.com/shop/buy-iphone/iphone-15',
          currentPrice: 10,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 43, competitorId: 7 });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<script type="application/ld+json">{"@type":"Product","offers":[{"@type":"Offer","price":"10","priceCurrency":"USD"},{"@type":"Offer","price":"799","priceCurrency":"USD"}]}</script>',
    });

    const result = await service.scrapeCompetitor(7);

    expect(result.capturedProducts).toEqual([
      {
        productId: 12,
        name: 'iPhone 15',
        price: 799,
        currency: 'USD',
        availability: 'UNKNOWN',
        scrapeMethod: 'jsonld',
      },
    ]);
  });

  it('does not capture prices from DOM-only markup without Shopify, Daraz, or JSON-LD', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 8,
      name: 'Credit Demo',
      url: 'https://shop.example.com',
      products: [
        {
          id: 14,
          name: 'Laptop',
          url: 'https://shop.example.com/laptop',
          currentPrice: 20,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 45, competitorId: 8 });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<html><body>' +
        '<div class="monthly-price">$10/mo</div>' +
        '<div class="trade-in-box">Trade in and save $200</div>' +
        '<div class="product-price" data-product-price="799">$799</div>' +
        '</body></html>',
    });

    await expect(service.scrapeCompetitor(8)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.stringMatching(
          /No product prices could be captured|PRICE_NOT_FOUND/i,
        ),
      }),
    });
  });

  it('rejects financing-style DOM text when no structured price source exists', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 9,
      name: 'DOM Demo',
      url: 'https://shop.example.com',
      products: [
        {
          id: 15,
          name: 'Phone',
          url: 'https://shop.example.com/phone',
          currentPrice: 10,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 46, competitorId: 9 });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<html><body>' +
        '<div class="monthly-price">$10/mo</div>' +
        '<div class="product-price">Starting at $799</div>' +
        '</body></html>',
    });

    await expect(service.scrapeCompetitor(9)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.stringMatching(
          /No product prices could be captured|PRICE_NOT_FOUND/i,
        ),
      }),
    });
  });

  it('rejects financing and trade-in values when no trustworthy purchase price exists', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 10,
      name: 'Apple-like financing page',
      url: 'https://shop.example.com',
      products: [
        {
          id: 16,
          name: 'iPhone 15',
          url: 'https://shop.example.com/iphone-15',
          currentPrice: 10,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<html><body>' +
        '<div class="monthly-price">$10/mo</div>' +
        '<div class="trade-in-box">Trade in and get up to $799 in credit</div>' +
        '<p>Pay monthly over 24 months</p>' +
        '</body></html>',
    });

    await expect(service.scrapeCompetitor(10)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.stringMatching(
          /No product prices could be captured|PRICE_NOT_FOUND/i,
        ),
      }),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns PRICE_NOT_FOUND for ambiguous price values instead of guessing', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 11,
      name: 'Ambiguous pricing',
      url: 'https://shop.example.com',
      products: [
        {
          id: 17,
          name: 'Laptop',
          url: 'https://shop.example.com/laptop',
          currentPrice: 10,
          currency: 'USD',
        },
      ],
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<html><body><div class="price">$10</div><div class="promo">save 20% now</div></body></html>',
    });

    await expect(service.scrapeCompetitor(11)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.stringMatching(
          /No product prices could be captured|PRICE_NOT_FOUND/i,
        ),
      }),
    });
  });

  it('rejects invalid and missing price payloads', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 12,
      name: 'Invalid Demo',
      url: 'https://shop.example.com',
      products: [
        {
          id: 18,
          name: 'Invalid Product',
          url: 'https://shop.example.com/invalid',
          currentPrice: 10,
          currency: 'USD',
        },
      ],
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () =>
        '<html><body><p>Only $10/mo with trade-in credit</p></body></html>',
    });

    await expect(service.scrapeCompetitor(12)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('does not create an empty snapshot when no price can be captured', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 7,
      name: 'Example Store',
      url: 'https://example.com',
      products: [
        {
          id: 11,
          name: 'Running Shoe',
          url: 'https://example.com/shoe',
          currentPrice: 99,
          currency: 'USD',
        },
      ],
    });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => '<html></html>',
    });

    await expect(service.scrapeCompetitor(7)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('uses Shopify product JSON for a single variant and saves its canonical title', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 20,
      name: 'Shop',
      url: 'https://shop.example',
      products: [
        {
          id: 30,
          name: 'Old name',
          url: 'https://shop.example/products/classic-tee',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 50, competitorId: 20 });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<div id="shopify-section-main-product"></div><script>Shopify.currency.active = "USD"</script>',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Classic Tee',
          variants: [
            { id: 101, available: true, price: 2599, compare_at_price: 3200 },
          ],
        }),
      });

    await expect(service.scrapeCompetitor(20)).resolves.toMatchObject({
      capturedProducts: [
        {
          productId: 30,
          name: 'Classic Tee',
          price: 25.99,
          currency: 'USD',
          availability: 'IN_STOCK',
        },
      ],
    });
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      'https://shop.example/products/classic-tee.js',
      expect.anything(),
    );
    expect(transaction.product.update).toHaveBeenCalledWith({
      where: { id: 30 },
      data: {
        name: 'Classic Tee',
        currentPrice: 25.99,
        currency: 'USD',
        availability: 'IN_STOCK',
        scrapeMethod: 'shopify',
      },
    });
  });

  it('uses an explicit Shopify variant id instead of another available variant', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 21,
      name: 'Shop',
      url: 'https://shop.example',
      products: [
        {
          id: 31,
          name: 'Variant product',
          url: 'https://shop.example/products/hoodie?variant=202',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 51, competitorId: 21 });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<script>window.Shopify = { shop: "shop.example", currency: "USD" };</script>',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Hoodie',
          variants: [
            { id: 101, available: true, price: 5000 },
            { id: 202, available: true, price: 7500 },
          ],
        }),
      });

    await expect(service.scrapeCompetitor(21)).resolves.toMatchObject({
      capturedProducts: [
        { productId: 31, name: 'Hoodie', price: 75, currency: 'USD' },
      ],
    });
  });

  it('picks the first available Shopify variant when no ?variant= is present', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 26,
      name: 'Shop',
      url: 'https://shop.example',
      products: [
        {
          id: 36,
          name: 'Multi',
          url: 'https://shop.example/products/multi',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 54, competitorId: 26 });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<div class="shopify-section"></div><script>Shopify.currency.active = "USD"</script>',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Multi Variant Tee',
          variants: [
            { id: 1, available: false, price: 1000 },
            { id: 2, available: true, price: 2200 },
            { id: 3, available: true, price: 3300 },
          ],
        }),
      });

    await expect(service.scrapeCompetitor(26)).resolves.toMatchObject({
      capturedProducts: [
        {
          productId: 36,
          name: 'Multi Variant Tee',
          price: 22,
          currency: 'USD',
          availability: 'IN_STOCK',
        },
      ],
    });
  });

  it('returns PRICE_NOT_FOUND when the requested Shopify variant is unavailable', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 27,
      name: 'Shop',
      url: 'https://shop.example',
      products: [
        {
          id: 37,
          name: 'Unavailable',
          url: 'https://shop.example/products/tee?variant=999',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<div class="shopify-section"></div><script>Shopify.currency.active = "USD"</script>',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Unavailable Tee',
          variants: [
            { id: 101, available: true, price: 2500 },
            { id: 999, available: false, price: 2800 },
          ],
        }),
      });

    await expect(service.scrapeCompetitor(27)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.stringMatching(/PRICE_NOT_FOUND/i),
      }),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('captures Shopify selling price as OUT_OF_STOCK when every variant is unavailable', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 28,
      name: 'Shop',
      url: 'https://shop.example',
      products: [
        {
          id: 38,
          name: 'Sold out',
          url: 'https://shop.example/products/sold-out',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 55, competitorId: 28 });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<div class="shopify-section"></div><script>Shopify.currency.active = "USD"</script>',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Sold Out Tee',
          variants: [
            { id: 1, available: false, price: 2800 },
            { id: 2, available: false, price: 2800 },
          ],
        }),
      });

    await expect(service.scrapeCompetitor(28)).resolves.toMatchObject({
      capturedProducts: [
        {
          productId: 38,
          name: 'Sold Out Tee',
          price: 28,
          currency: 'USD',
          availability: 'OUT_OF_STOCK',
        },
      ],
    });
  });

  it('uses Shopify selling price, never the compare-at sale price', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 22,
      name: 'Shop',
      url: 'https://shop.example',
      products: [
        {
          id: 32,
          name: 'Sale',
          url: 'https://shop.example/products/sale',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 52, competitorId: 22 });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<div class="shopify-section"><meta property="og:price:currency" content="USD"></div>',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Sale item',
          variants: [
            { id: 101, available: true, price: 7500, compare_at_price: 10000 },
          ],
        }),
      });

    await expect(service.scrapeCompetitor(22)).resolves.toMatchObject({
      capturedProducts: [{ productId: 32, price: 75, currency: 'USD' }],
    });
  });

  it('returns PRICE_NOT_FOUND and creates no snapshot for a Shopify product with no valid price', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 23,
      name: 'Shop',
      url: 'https://shop.example',
      products: [
        {
          id: 33,
          name: 'Missing',
          url: 'https://shop.example/products/missing',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () =>
          '<div class="shopify-section"></div><script>Shopify.currency.active = "USD"</script>',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          title: 'Missing',
          variants: [{ id: 101, available: true, price: null }],
        }),
      });

    await expect(service.scrapeCompetitor(23)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.stringMatching(/PRICE_NOT_FOUND/i),
      }),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns PRICE_NOT_FOUND and creates no snapshot for malformed Shopify JSON', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 24,
      name: 'Shop',
      url: 'https://shop.example',
      products: [
        {
          id: 34,
          name: 'Malformed',
          url: 'https://shop.example/products/malformed',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        text: async () => '<div class="shopify-section"></div>',
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('invalid JSON');
        },
      });

    await expect(service.scrapeCompetitor(24)).rejects.toBeInstanceOf(
      BadGatewayException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps the generic extractor as the fallback for non-Shopify product pages', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 25,
      name: 'Other',
      url: 'https://other.example',
      products: [
        {
          id: 35,
          name: 'Generic',
          url: 'https://other.example/product',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 53, competitorId: 25 });
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        '<script type="application/ld+json">{"@type":"Product","offers":{"@type":"Offer","price":"19.99","priceCurrency":"USD"}}</script>',
    });

    await expect(service.scrapeCompetitor(25)).resolves.toMatchObject({
      capturedProducts: [
        { productId: 35, name: 'Generic', price: 19.99, currency: 'USD' },
      ],
    });
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('extracts Daraz selling price and title from SSR __moduleData__ tracking fields', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 40,
      name: 'Daraz Seller',
      url: 'https://www.daraz.pk',
      products: [
        {
          id: 50,
          name: 'Seed name',
          url: 'https://www.daraz.pk/products/demo-i927260311.html',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 60, competitorId: 40 });
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        '<html><body><script>var __moduleData__ = {"data":{"root":{"fields":{"product":{"title":"Realme 15T 5G"},"globalConfig":{"currency":"PKR","isDaraz":true,"siteName":"Daraz"},"tracking":{"pdt_price":"Rs. 101,999","pdt_name":"Realme 15T 5G","core":{"currencyCode":"PKR"}},"primaryKey":{"skuId":"3984319179","defaultSkuId":"3984319179"},"skuInfos":{"3984319179":{"skuId":"3984319179"}}}}}};</script></body></html>',
    });

    await expect(service.scrapeCompetitor(40)).resolves.toMatchObject({
      capturedProducts: [
        {
          productId: 50,
          name: 'Realme 15T 5G',
          price: 101999,
          currency: 'PKR',
        },
      ],
    });
    expect(transaction.product.update).toHaveBeenCalledWith({
      where: { id: 50 },
      data: {
        name: 'Realme 15T 5G',
        currentPrice: 101999,
        currency: 'PKR',
        availability: 'UNKNOWN',
        scrapeMethod: 'daraz',
      },
    });
  });

  it('captures nested Daraz salePrice when tracking still shows the original price', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 43,
      name: 'Daraz Seller',
      url: 'https://www.daraz.pk',
      products: [
        {
          id: 53,
          name: 'Seed',
          url: 'https://www.daraz.pk/products/bag-i944299667.html',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 62, competitorId: 43 });
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        '<div id="module_product_price"><span class="pdp-price">Rs. 600</span><span class="origin-price">Rs. 1,200</span><span>-50%</span></div><script>var __moduleData__ = {"data":{"root":{"fields":{"product":{"title":"Bag"},"globalConfig":{"currency":"PKR","isDaraz":true},"tracking":{"pdt_price":"Rs. 1,200","core":{"currencyCode":"PKR"}},"primaryKey":{"skuId":"22"},"skuInfos":{"22":{"skuId":"22","price":{"originalPrice":"1200","salePriceString":"600","salePrice":{"text":"Rs. 600"}}}}}}}};</script>',
    });

    await expect(service.scrapeCompetitor(43)).resolves.toMatchObject({
      capturedProducts: [
        { productId: 53, name: 'Bag', price: 600, currency: 'PKR' },
      ],
    });
  });

  it('captures Daraz sale price instead of original list price', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 41,
      name: 'Daraz Seller',
      url: 'https://www.daraz.pk',
      products: [
        {
          id: 51,
          name: 'Seed',
          url: 'https://www.daraz.pk/products/demo-i1-s22.html',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 61, competitorId: 41 });
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        '<script>var __moduleData__ = {"data":{"root":{"fields":{"product":{"title":"Bag"},"globalConfig":{"currency":"PKR","isDaraz":true},"tracking":{"pdt_price":"Rs. 600","core":{"currencyCode":"PKR"}},"primaryKey":{"skuId":"22"},"skuInfos":{"22":{"skuId":"22","price":1200,"salePrice":600}}}}}};</script>',
    });

    await expect(service.scrapeCompetitor(41)).resolves.toMatchObject({
      capturedProducts: [
        { productId: 51, name: 'Bag', price: 600, currency: 'PKR' },
      ],
    });
  });

  it('uses Daraz displayed selling price when skuInfos only has a list price', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 41,
      name: 'Daraz Seller',
      url: 'https://www.daraz.pk',
      products: [
        {
          id: 51,
          name: 'Seed',
          url: 'https://www.daraz.pk/products/demo-i1-s22.html',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 61, competitorId: 41 });
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        '<script>var __moduleData__ = {"data":{"root":{"fields":{"product":{"title":"SKU Priced"},"globalConfig":{"currency":"PKR","isDaraz":true},"tracking":{"pdt_price":"Rs. 999","core":{"currencyCode":"PKR"}},"primaryKey":{"skuId":"22"},"skuInfos":{"22":{"skuId":"22","price":1500}}}}}};</script>',
    });

    await expect(service.scrapeCompetitor(41)).resolves.toMatchObject({
      capturedProducts: [
        { productId: 51, name: 'SKU Priced', price: 999, currency: 'PKR' },
      ],
    });
  });

  it('returns PRICE_NOT_FOUND for Daraz pages missing pdt_price and sku price', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 42,
      name: 'Daraz Seller',
      url: 'https://www.daraz.pk',
      products: [
        {
          id: 52,
          name: 'Missing',
          url: 'https://www.daraz.pk/products/missing-i2.html',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        '<script>var __moduleData__ = {"data":{"root":{"fields":{"product":{"title":"No Price"},"globalConfig":{"currency":"PKR","isDaraz":true},"tracking":{"pdt_price":"","core":{"currencyCode":"PKR"}},"primaryKey":{"skuId":"9"},"skuInfos":{"9":{"skuId":"9"}}}}}};</script>',
    });

    await expect(service.scrapeCompetitor(42)).rejects.toMatchObject({
      response: expect.objectContaining({
        message: expect.stringMatching(/PRICE_NOT_FOUND/i),
      }),
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('does not treat empty Daraz JSON-LD offers as a valid price', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 43,
      name: 'Daraz Seller',
      url: 'https://www.daraz.pk',
      products: [
        {
          id: 53,
          name: 'LD empty',
          url: 'https://www.daraz.pk/products/ld-i3.html',
          currentPrice: 0,
          currency: 'USD',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 62, competitorId: 43 });
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        '<script type="application/ld+json">{"@type":"Product","name":"Phone","offers":{"@type":"AggregateOffer","availability":"https://schema.org/InStock"}}</script>' +
        '<script>var __moduleData__ = {"data":{"root":{"fields":{"product":{"title":"Phone"},"globalConfig":{"currency":"PKR","isDaraz":true,"siteName":"Daraz"},"tracking":{"pdt_price":"Rs. 350,599","core":{"currencyCode":"PKR"}},"primaryKey":{"skuId":"1"},"skuInfos":{"1":{"skuId":"1"}}}}}};</script>',
    });

    await expect(service.scrapeCompetitor(43)).resolves.toMatchObject({
      capturedProducts: [
        {
          productId: 53,
          name: 'Phone',
          price: 350599,
          currency: 'PKR',
          availability: 'UNKNOWN',
        },
      ],
    });
  });

  it('captures Daraz availability from operation.disable false as IN_STOCK', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 44,
      name: 'Daraz Seller',
      url: 'https://www.daraz.pk',
      products: [
        {
          id: 54,
          name: 'Bag',
          url: 'https://www.daraz.pk/products/bag-i4.html',
          currentPrice: 0,
          currency: 'PKR',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 63, competitorId: 44 });
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        '<script>var __moduleData__ = {"data":{"root":{"fields":{"product":{"title":"Bag"},"globalConfig":{"currency":"PKR","isDaraz":true},"tracking":{"pdt_price":"Rs. 999","core":{"currencyCode":"PKR"}},"primaryKey":{"skuId":"8"},"skuInfos":{"8":{"skuId":"8","operation":{"disable":false}}}}}}};</script>',
    });

    await expect(service.scrapeCompetitor(44)).resolves.toMatchObject({
      capturedProducts: [
        {
          productId: 54,
          name: 'Bag',
          price: 999,
          currency: 'PKR',
          availability: 'IN_STOCK',
        },
      ],
    });
  });

  it('captures Daraz availability from operation.disable true as OUT_OF_STOCK without failing price', async () => {
    prisma.competitor.findUnique.mockResolvedValue({
      id: 45,
      name: 'Daraz Seller',
      url: 'https://www.daraz.pk',
      products: [
        {
          id: 55,
          name: 'Bag',
          url: 'https://www.daraz.pk/products/bag-i5.html',
          currentPrice: 0,
          currency: 'PKR',
        },
      ],
    });
    prisma.$transaction.mockImplementation(
      async (callback: (client: typeof transaction) => unknown) =>
        callback(transaction),
    );
    transaction.snapshot.create.mockResolvedValue({ id: 64, competitorId: 45 });
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      text: async () =>
        '<script>var __moduleData__ = {"data":{"root":{"fields":{"product":{"title":"Bag"},"globalConfig":{"currency":"PKR","isDaraz":true},"tracking":{"pdt_price":"Rs. 999","core":{"currencyCode":"PKR"}},"primaryKey":{"skuId":"8"},"skuInfos":{"8":{"skuId":"8","operation":{"disable":true}}}}}}};</script>',
    });

    await expect(service.scrapeCompetitor(45)).resolves.toMatchObject({
      capturedProducts: [
        {
          productId: 55,
          name: 'Bag',
          price: 999,
          currency: 'PKR',
          availability: 'OUT_OF_STOCK',
        },
      ],
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('times out a hung product page fetch instead of waiting forever', async () => {
    jest.useFakeTimers();
    prisma.competitor.findUnique.mockResolvedValue({
      id: 50,
      name: 'Hung Store',
      url: 'https://hung.example.com',
      products: [
        {
          id: 99,
          name: 'Stuck SKU',
          url: 'https://hung.example.com/product',
          currentPrice: 10,
          currency: 'USD',
        },
      ],
    });
    global.fetch = jest.fn().mockImplementation(
      (_url: string, init?: { signal?: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const error = new Error('The operation was aborted');
            error.name = 'AbortError';
            reject(error);
          });
        }),
    );

    try {
      const scrapePromise = service.scrapeCompetitor(50);
      const assertion = expect(scrapePromise).rejects.toBeInstanceOf(
        BadGatewayException,
      );
      await jest.advanceTimersByTimeAsync(20_000);
      await assertion;
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.captureLog.update).toHaveBeenCalledWith({
        where: { id: 900 },
        data: expect.objectContaining({
          status: 'failed',
          productsScraped: 0,
        }),
      });
    } finally {
      jest.useRealTimers();
    }
  });
});
