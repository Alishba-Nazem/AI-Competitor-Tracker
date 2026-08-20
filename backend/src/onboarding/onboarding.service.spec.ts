import { BadGatewayException, ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { DiscoveryService } from '../scraper/discovery.service';
import { OnboardingService } from './onboarding.service';

describe('OnboardingService', () => {
  let service: OnboardingService;

  const prisma = {
    $transaction: jest.fn(async (ops: Array<Promise<unknown>>) => Promise.all(ops)),
    businessProfile: {
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    competitor: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    product: { deleteMany: jest.fn() },
    snapshot: { deleteMany: jest.fn() },
    snapshotProduct: { deleteMany: jest.fn() },
    review: { deleteMany: jest.fn() },
    captureLog: { deleteMany: jest.fn() },
  };

  const discoveryService = {
    discoverCompetitor: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        { provide: PrismaService, useValue: prisma },
        { provide: DiscoveryService, useValue: discoveryService },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
  });

  it('returns onboarding status when profile exists', async () => {
    const profile = {
      id: 1,
      businessName: 'Acme',
      category: 'Fashion',
      country: 'Pakistan',
    };
    prisma.businessProfile.findFirst.mockResolvedValue(profile);

    await expect(service.getStatus()).resolves.toEqual({
      completed: true,
      profile,
    });
  });

  it('returns incomplete status when profile is missing', async () => {
    prisma.businessProfile.findFirst.mockResolvedValue(null);

    await expect(service.getStatus()).resolves.toEqual({
      completed: false,
      profile: null,
    });
  });

  it('resets tracker data so onboarding can run again', async () => {
    prisma.captureLog.deleteMany.mockResolvedValue({ count: 1 });
    prisma.review.deleteMany.mockResolvedValue({ count: 1 });
    prisma.snapshotProduct.deleteMany.mockResolvedValue({ count: 1 });
    prisma.snapshot.deleteMany.mockResolvedValue({ count: 1 });
    prisma.product.deleteMany.mockResolvedValue({ count: 1 });
    prisma.competitor.deleteMany.mockResolvedValue({ count: 1 });
    prisma.businessProfile.deleteMany.mockResolvedValue({ count: 1 });

    await expect(service.reset()).resolves.toMatchObject({
      reset: true,
      completed: false,
    });
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('rejects duplicate onboarding completion', async () => {
    prisma.businessProfile.findFirst.mockResolvedValue({ id: 1 });

    await expect(
      service.complete({
        businessName: 'Acme',
        category: 'Fashion',
        country: 'Pakistan',
        competitors: [{ url: 'https://www.daraz.pk/shop/bonanza-satrangi' }],
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates profile, competitors, and runs discovery', async () => {
    prisma.businessProfile.findFirst.mockResolvedValue(null);
    prisma.businessProfile.create.mockResolvedValue({
      id: 1,
      businessName: 'Acme',
      category: 'Fashion',
      country: 'Pakistan',
      storeUrl: null,
    });
    prisma.competitor.create
      .mockResolvedValueOnce({
        id: 10,
        name: 'Bonanza Satrangi',
        url: 'https://www.daraz.pk/shop/bonanza-satrangi',
      })
      .mockResolvedValueOnce({
        id: 11,
        name: 'Allbirds',
        url: 'https://www.allbirds.com',
      });
    discoveryService.discoverCompetitor
      .mockResolvedValueOnce({
        platform: 'DARAZ',
        discovered: 24,
        created: 24,
      })
      .mockResolvedValueOnce({
        platform: 'SHOPIFY',
        discovered: 20,
        created: 20,
      });

    await expect(
      service.complete({
        businessName: 'Acme',
        category: 'Fashion',
        country: 'Pakistan',
        competitors: [
          { url: 'https://www.daraz.pk/shop/bonanza-satrangi' },
          { url: 'https://www.allbirds.com', name: 'Allbirds' },
        ],
      }),
    ).resolves.toMatchObject({
      profile: { id: 1 },
      totalDiscovered: 44,
      totalCreated: 44,
      competitors: [
        {
          competitorId: 10,
          platform: 'DARAZ',
          discovered: 24,
          created: 24,
        },
        {
          competitorId: 11,
          name: 'Allbirds',
          platform: 'SHOPIFY',
          discovered: 20,
          created: 20,
        },
      ],
    });

    expect(prisma.competitor.create).toHaveBeenCalledTimes(2);
    expect(discoveryService.discoverCompetitor).toHaveBeenCalledWith(10);
    expect(discoveryService.discoverCompetitor).toHaveBeenCalledWith(11);
  });

  it('fails when no competitor discovery succeeds', async () => {
    prisma.businessProfile.findFirst.mockResolvedValue(null);
    prisma.businessProfile.create.mockResolvedValue({
      id: 1,
      businessName: 'Acme',
      category: 'Fashion',
      country: 'Pakistan',
    });
    prisma.competitor.create.mockResolvedValue({
      id: 10,
      name: 'Bad Shop',
      url: 'https://example.com/shop/bad',
    });
    discoveryService.discoverCompetitor.mockRejectedValue(
      new Error('NO_PRODUCTS_FOUND'),
    );
    prisma.competitor.deleteMany.mockResolvedValue({ count: 1 });
    prisma.businessProfile.delete.mockResolvedValue({ id: 1 });

    await expect(
      service.complete({
        businessName: 'Acme',
        category: 'Fashion',
        country: 'Pakistan',
        competitors: [{ url: 'https://example.com/shop/bad' }],
      }),
    ).rejects.toBeInstanceOf(BadGatewayException);

    expect(prisma.competitor.deleteMany).toHaveBeenCalledWith({
      where: { businessProfileId: 1 },
    });
    expect(prisma.businessProfile.delete).toHaveBeenCalledWith({
      where: { id: 1 },
    });
  });
});
