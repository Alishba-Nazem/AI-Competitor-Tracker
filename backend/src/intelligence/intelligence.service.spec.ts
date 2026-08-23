import { Test, TestingModule } from '@nestjs/testing';
import { ChangesService } from '../changes/changes.service';
import { PrismaService } from '../prisma.service';
import { ClaudeClient } from './claude.client';
import { IntelligenceService } from './intelligence.service';

describe('IntelligenceService', () => {
  let service: IntelligenceService;

  const prisma = {
    businessProfile: { findUnique: jest.fn() },
    competitor: { findMany: jest.fn(), findFirst: jest.fn() },
    review: { findMany: jest.fn() },
  };

  const changesService = {
    findByCompetitor: jest.fn(),
  };
  const claude = {
    isConfigured: jest.fn().mockReturnValue(false),
    provider: jest.fn().mockReturnValue(null),
    completeJson: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    claude.isConfigured.mockReturnValue(false);
    claude.provider.mockReturnValue(null);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligenceService,
        { provide: PrismaService, useValue: prisma },
        { provide: ChangesService, useValue: changesService },
        { provide: ClaudeClient, useValue: claude },
      ],
    }).compile();

    service = module.get(IntelligenceService);
  });

  it('builds dashboard findings from stored changes and reviews', async () => {
    prisma.businessProfile.findUnique.mockResolvedValue({
      id: 1,
      userId: 7,
      businessName: 'Bag store',
      category: 'Women bag',
      country: 'Pakistan',
    });
    prisma.competitor.findMany.mockResolvedValue([
      {
        id: 10,
        name: 'Ayan mall',
        products: [{ currentPrice: 1800, currency: 'PKR' }],
      },
    ]);
    prisma.review.findMany.mockResolvedValue([]);
    changesService.findByCompetitor.mockResolvedValue({
      changes: [
        {
          type: 'PRICE_DECREASE',
          productId: 5,
          productName: 'Shoulder bag',
          previousPrice: 2000,
          currentPrice: 1800,
          currency: 'PKR',
          percentageChange: -10,
        },
        {
          type: 'NEW_PRODUCT',
          productId: 6,
          productName: 'Wristlet',
          currency: 'PKR',
        },
      ],
    });

    const dashboard = await service.getDashboard(7);
    expect(dashboard.summary.competitorCount).toBe(1);
    expect(dashboard.findings.some((item) => item.kind === 'PRICE_DECREASE')).toBe(
      true,
    );
    expect(dashboard.findings.some((item) => item.kind === 'NEW_PRODUCT')).toBe(
      true,
    );
    expect(dashboard.market.enoughData).toBe(false);
  });

  it('returns competitor intelligence for a known competitor', async () => {
    prisma.competitor.findFirst.mockResolvedValue({
      id: 10,
      name: 'Ayan mall',
      url: 'https://www.daraz.pk/shop/6pvpbrik/',
      platform: 'DARAZ',
      isActive: true,
      products: [{ currentPrice: 600, currency: 'PKR' }],
    });
    prisma.review.findMany.mockResolvedValue([]);
    prisma.businessProfile.findUnique.mockResolvedValue({
      category: 'Women bag',
    });
    changesService.findByCompetitor.mockResolvedValue({ changes: [] });

    await expect(service.getCompetitor(7, 10)).resolves.toMatchObject({
      competitor: { id: 10, name: 'Ayan mall' },
      summary: { capturedProductCount: 1, reviewCount: 0, averagePrice: 600 },
      enoughReviewData: false,
    });
  });

  it('returns a fallback briefing when Claude is not configured', async () => {
    prisma.businessProfile.findUnique.mockResolvedValue({
      businessName: 'Bag store',
      category: 'Women bag',
      country: 'Pakistan',
    });
    prisma.competitor.findMany.mockResolvedValue([
      {
        id: 10,
        name: 'Ayan mall',
        products: [{ currentPrice: 1800, currency: 'PKR' }],
      },
    ]);
    prisma.review.findMany.mockResolvedValue([]);
    changesService.findByCompetitor.mockResolvedValue({
      changes: [
        {
          type: 'PRICE_DECREASE',
          productId: 5,
          productName: 'Shoulder bag',
          previousPrice: 2000,
          currentPrice: 1800,
          currency: 'PKR',
          percentageChange: -10,
        },
      ],
    });

    const briefing = await service.getBriefing(7);
    expect(briefing.source).toBe('fallback');
    expect(briefing.available).toBe(true);
    expect(claude.completeJson).not.toHaveBeenCalled();
  });
});
