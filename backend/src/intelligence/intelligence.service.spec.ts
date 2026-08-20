import { Test, TestingModule } from '@nestjs/testing';
import { ChangesService } from '../changes/changes.service';
import { PrismaService } from '../prisma.service';
import { IntelligenceService } from './intelligence.service';

describe('IntelligenceService', () => {
  let service: IntelligenceService;

  const prisma = {
    businessProfile: { findFirst: jest.fn() },
    competitor: { findMany: jest.fn(), findUnique: jest.fn() },
    review: { findMany: jest.fn() },
  };

  const changesService = {
    findByCompetitor: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntelligenceService,
        { provide: PrismaService, useValue: prisma },
        { provide: ChangesService, useValue: changesService },
      ],
    }).compile();

    service = module.get(IntelligenceService);
  });

  it('builds dashboard findings from stored changes and reviews', async () => {
    prisma.businessProfile.findFirst.mockResolvedValue({
      id: 1,
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

    const dashboard = await service.getDashboard();
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
    prisma.competitor.findUnique.mockResolvedValue({
      id: 10,
      name: 'Ayan mall',
      url: 'https://www.daraz.pk/shop/6pvpbrik/',
      platform: 'DARAZ',
      isActive: true,
      products: [{ currentPrice: 600, currency: 'PKR' }],
    });
    prisma.review.findMany.mockResolvedValue([]);
    prisma.businessProfile.findFirst.mockResolvedValue({
      category: 'Women bag',
    });
    changesService.findByCompetitor.mockResolvedValue({ changes: [] });

    await expect(service.getCompetitor(10)).resolves.toMatchObject({
      competitor: { id: 10, name: 'Ayan mall' },
      summary: { capturedProductCount: 1, reviewCount: 0, averagePrice: 600 },
      enoughReviewData: false,
    });
  });
});
