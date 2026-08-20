import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { DarazReviewAdapter } from './daraz-review.adapter';
import { ReviewScraperService } from './review-scraper.service';
import { ShopifyReviewAdapter } from './shopify-review.adapter';

describe('ReviewScraperService', () => {
  let service: ReviewScraperService;
  const prisma = {
    product: { findUnique: jest.fn(), update: jest.fn() },
    review: { createMany: jest.fn() },
    competitor: { findUnique: jest.fn() },
  };
  const darazReviewAdapter = { scrape: jest.fn(), scrapeMany: jest.fn() };
  const shopifyReviewAdapter = { scrape: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewScraperService,
        { provide: PrismaService, useValue: prisma },
        { provide: DarazReviewAdapter, useValue: darazReviewAdapter },
        { provide: ShopifyReviewAdapter, useValue: shopifyReviewAdapter },
      ],
    }).compile();
    service = module.get(ReviewScraperService);
  });

  it('stores extracted Daraz reviews and skips duplicates on createMany', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 12,
      url: 'https://www.daraz.pk/products/bag-i430012403.html',
      competitor: { platform: 'DARAZ' },
    });
    prisma.product.update.mockResolvedValue({});
    prisma.review.createMany.mockResolvedValue({ count: 1 });
    darazReviewAdapter.scrape.mockResolvedValue({
      available: true,
      source: 'DARAZ',
      reviews: [
        {
          text: 'Very good bag',
          rating: 5,
          reviewDate: new Date('2024-06-13'),
        },
        {
          text: 'Very good bag',
          rating: 5,
          reviewDate: new Date('2024-06-13'),
        },
      ],
    });

    const result = await service.scrapeProduct(12);

    expect(darazReviewAdapter.scrape).toHaveBeenCalled();
    const createManyCalls = prisma.review.createMany.mock.calls as Array<
      [
        {
          data: Array<{ productId: number; text: string; source: string }>;
          skipDuplicates: boolean;
        },
      ]
    >;
    const payload = createManyCalls[0][0];
    expect(payload.skipDuplicates).toBe(true);
    expect(payload.data[0]).toMatchObject({
      productId: 12,
      text: 'Very good bag',
      source: 'DARAZ',
    });
    expect(result.extracted).toBe(1);
    expect(result.created).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it('does not fabricate Shopify reviews when the provider is not extractable', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 7,
      url: 'https://colourpop.com/products/perfect-4-u-ultra-glossy-lip-set',
      competitor: { platform: 'SHOPIFY' },
    });
    prisma.product.update.mockResolvedValue({});
    shopifyReviewAdapter.scrape.mockResolvedValue({
      available: false,
      source: 'SHOPIFY_OKENDO',
      reason: 'not extractable',
      reviews: [],
    });

    const result = await service.scrapeProduct(7);
    expect(prisma.review.createMany).not.toHaveBeenCalled();
    expect(result.available).toBe(false);
    expect(result.created).toBe(0);
  });

  it('attempts Shopify review detection when competitor platform is unset', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 7,
      url: 'https://www.allbirds.com/products/mens-tree-runners',
      competitor: { platform: null },
    });
    prisma.product.update.mockResolvedValue({});
    shopifyReviewAdapter.scrape.mockResolvedValue({
      available: false,
      source: 'SHOPIFY_YOTPO',
      reason: 'not extractable',
      reviews: [],
    });

    await service.scrapeProduct(7);
    expect(shopifyReviewAdapter.scrape).toHaveBeenCalled();
    expect(darazReviewAdapter.scrape).not.toHaveBeenCalled();
  });

  it('captures reviews for all discovered Daraz products, not a 4-product subset', async () => {
    const products = Array.from({ length: 6 }, (_, index) => ({
      id: index + 1,
      url: `https://www.daraz.pk/products/item-i${index + 1}.html`,
    }));
    prisma.competitor.findUnique.mockResolvedValue({
      id: 3,
      platform: 'DARAZ',
      products,
    });
    prisma.product.findUnique.mockImplementation(({ where }: { where: { id: number } }) =>
      Promise.resolve({ id: where.id, url: products[where.id - 1].url }),
    );
    prisma.product.update.mockResolvedValue({});
    prisma.review.createMany.mockResolvedValue({ count: 1 });
    darazReviewAdapter.scrapeMany.mockResolvedValue(
      products.map((product) => ({
        url: product.url,
        result: {
          available: true,
          source: 'DARAZ',
          reviews: [{ text: `Review for ${product.id}`, rating: 5 }],
        },
      })),
    );

    const result = await service.scrapeCompetitor(3);

    expect(prisma.competitor.findUnique).toHaveBeenCalledWith({
      where: { id: 3 },
      include: {
        products: {
          orderBy: { id: 'asc' },
          take: 40,
        },
      },
    });
    expect(darazReviewAdapter.scrapeMany).toHaveBeenCalledWith(
      products.map((product) => product.url),
    );
    expect(result.processed).toBe(6);
  });
});
