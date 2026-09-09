import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  let service: ReviewsService;
  const prisma = {
    product: { findUnique: jest.fn() },
    competitor: { findUnique: jest.fn() },
    review: { findMany: jest.fn() },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReviewsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(ReviewsService);
  });

  it('summarizes stored reviews even if a later scrape marked the product unavailable', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 12,
      reviewsAvailable: false,
      reviewSource: 'DARAZ',
    });
    prisma.review.findMany.mockResolvedValue([
      { text: 'Very good bag', rating: 5 },
      { text: 'Zipper broke', rating: 2 },
    ]);

    const summary = await service.summaryForProduct(12);

    expect(summary.available).toBe(true);
    expect(summary.totalReviews).toBe(2);
    expect(summary.averageRating).toBe(3.5);
    expect(summary.message).toBeUndefined();
  });

  it('returns insights from stored reviews after a failed recapture', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 12,
      reviewsAvailable: false,
      reviewSource: 'DARAZ',
    });
    prisma.review.findMany.mockResolvedValue([
      { text: 'Great quality material', rating: 5 },
      { text: 'Love the design', rating: 5 },
      { text: 'Worth the price', rating: 4 },
      { text: 'Good stitching', rating: 5 },
      { text: 'Zipper broke on day one poor quality', rating: 1 },
    ]);

    const insights = await service.insightsForProduct(12);

    expect(insights.enoughData).toBe(true);
    expect(insights.message).toBeUndefined();
  });

  it('still reports unavailable when no reviews were ever stored', async () => {
    prisma.product.findUnique.mockResolvedValue({
      id: 12,
      reviewsAvailable: false,
      reviewSource: 'DARAZ',
    });
    prisma.review.findMany.mockResolvedValue([]);

    await expect(service.summaryForProduct(12)).resolves.toMatchObject({
      available: false,
      totalReviews: 0,
      message: "Reviews aren't publicly available for this product.",
    });
    await expect(service.insightsForProduct(12)).resolves.toMatchObject({
      enoughData: false,
      message: "Reviews aren't publicly available for this product.",
    });
  });
});
