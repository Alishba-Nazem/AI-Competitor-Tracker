import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { ChangesService } from './changes.service';

describe('ChangesService', () => {
  let service: ChangesService;
  const prisma = {
    snapshot: { findMany: jest.fn() },
  };

  const snapshot = (
    id: number,
    products: Array<{
      productId: number;
      name: string;
      url: string;
      price: number;
      currency?: string;
      availability?: string | null;
    }>,
    options?: {
      competitorId?: number;
      createdAt?: string;
    },
  ) => ({
    id,
    competitorId: options?.competitorId ?? 4,
    createdAt: options?.createdAt
      ? new Date(options.createdAt)
      : new Date(`2026-01-${String(id).padStart(2, '0')}T00:00:00.000Z`),
    products: products.map((product) => ({
      ...product,
      currency: product.currency ?? 'USD',
    })),
  });

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChangesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<ChangesService>(ChangesService);
  });

  it('detects a price increase', async () => {
    prisma.snapshot.findMany.mockResolvedValue([
      snapshot(2, [
        {
          productId: 10,
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 120,
        },
      ]),
      snapshot(1, [
        {
          productId: 10,
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 100,
        },
      ]),
    ]);

    await expect(service.findByCompetitor(4)).resolves.toEqual({
      competitorId: 4,
      latestSnapshotId: 2,
      previousSnapshotId: 1,
      hasChanges: true,
      changes: [
        {
          type: 'PRICE_INCREASE',
          productId: 10,
          productName: 'Starter',
          productUrl: 'https://example.com/starter',
          previousPrice: 100,
          currentPrice: 120,
          currency: 'USD',
          priceDifference: 20,
          percentageChange: 20,
        },
      ],
    });
  });

  it('detects a price decrease', async () => {
    prisma.snapshot.findMany.mockResolvedValue([
      snapshot(2, [
        {
          productId: 10,
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 75,
        },
      ]),
      snapshot(1, [
        {
          productId: 10,
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 100,
        },
      ]),
    ]);

    const result = await service.findByCompetitor(4);

    expect(result.changes[0]).toMatchObject({
      type: 'PRICE_DECREASE',
      previousPrice: 100,
      currentPrice: 75,
      priceDifference: 25,
      percentageChange: -25,
    });
  });

  it('detects a PKR price decrease with absolute difference and signed percentage', async () => {
    prisma.snapshot.findMany.mockResolvedValue([
      snapshot(22, [
        {
          productId: 77,
          name: 'Probe Phone',
          url: 'https://example.com/probe',
          price: 79999,
          currency: 'PKR',
        },
      ]),
      snapshot(21, [
        {
          productId: 77,
          name: 'Probe Phone',
          url: 'https://example.com/probe',
          price: 80999,
          currency: 'PKR',
        },
      ]),
    ]);

    await expect(service.findByCompetitor(9)).resolves.toEqual({
      competitorId: 9,
      latestSnapshotId: 22,
      previousSnapshotId: 21,
      hasChanges: true,
      changes: [
        {
          type: 'PRICE_DECREASE',
          productId: 77,
          productName: 'Probe Phone',
          productUrl: 'https://example.com/probe',
          previousPrice: 80999,
          currentPrice: 79999,
          currency: 'PKR',
          priceDifference: 1000,
          percentageChange: -1.23,
        },
      ],
    });
  });

  it('detects a PKR price increase for 79999 -> 81999', async () => {
    prisma.snapshot.findMany.mockResolvedValue([
      snapshot(24, [
        {
          productId: 77,
          name: 'Probe Phone',
          url: 'https://example.com/probe',
          price: 81999,
          currency: 'PKR',
        },
      ]),
      snapshot(23, [
        {
          productId: 77,
          name: 'Probe Phone',
          url: 'https://example.com/probe',
          price: 79999,
          currency: 'PKR',
        },
      ]),
    ]);

    const result = await service.findByCompetitor(9);

    expect(result.changes).toEqual([
      {
        type: 'PRICE_INCREASE',
        productId: 77,
        productName: 'Probe Phone',
        productUrl: 'https://example.com/probe',
        previousPrice: 79999,
        currentPrice: 81999,
        currency: 'PKR',
        priceDifference: 2000,
        percentageChange: 2.5,
      },
    ]);
  });

  it('detects a new product', async () => {
    prisma.snapshot.findMany.mockResolvedValue([
      snapshot(2, [
        {
          productId: 12,
          name: 'Plus',
          url: 'https://example.com/plus',
          price: 50,
        },
      ]),
      snapshot(1, []),
    ]);

    const result = await service.findByCompetitor(4);

    expect(result.changes).toEqual([
      {
        type: 'NEW_PRODUCT',
        productId: 12,
        productName: 'Plus',
        productUrl: 'https://example.com/plus',
        currentPrice: 50,
        currency: 'USD',
      },
    ]);
  });

  it('detects a removed product', async () => {
    prisma.snapshot.findMany.mockResolvedValue([
      snapshot(2, []),
      snapshot(1, [
        {
          productId: 12,
          name: 'Plus',
          url: 'https://example.com/plus',
          price: 50,
        },
      ]),
    ]);

    const result = await service.findByCompetitor(4);

    expect(result.changes).toEqual([
      {
        type: 'REMOVED_PRODUCT',
        productId: 12,
        productName: 'Plus',
        productUrl: 'https://example.com/plus',
        previousPrice: 50,
        currency: 'USD',
      },
    ]);
  });

  it('returns no changes when matching products have the same price', async () => {
    prisma.snapshot.findMany.mockResolvedValue([
      snapshot(2, [
        {
          productId: 10,
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 100,
        },
      ]),
      snapshot(1, [
        {
          productId: 10,
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 100,
        },
      ]),
    ]);

    await expect(service.findByCompetitor(4)).resolves.toMatchObject({
      hasChanges: false,
      changes: [],
    });
  });

  it('returns an empty change set when only one snapshot exists', async () => {
    prisma.snapshot.findMany.mockResolvedValue([snapshot(2, [])]);

    await expect(service.findByCompetitor(4)).resolves.toEqual({
      competitorId: 4,
      latestSnapshotId: 2,
      previousSnapshotId: null,
      hasChanges: false,
      changes: [],
    });
  });

  it('returns an empty change set when no snapshots exist', async () => {
    prisma.snapshot.findMany.mockResolvedValue([]);

    await expect(service.findByCompetitor(4)).resolves.toEqual({
      competitorId: 4,
      latestSnapshotId: null,
      previousSnapshotId: null,
      hasChanges: false,
      changes: [],
    });
  });

  it('detects an availability change without treating it as a price change', async () => {
    prisma.snapshot.findMany.mockResolvedValue([
      snapshot(2, [
        {
          productId: 10,
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 100,
          availability: 'OUT_OF_STOCK',
        },
      ]),
      snapshot(1, [
        {
          productId: 10,
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 100,
          availability: 'IN_STOCK',
        },
      ]),
    ]);

    await expect(service.findByCompetitor(4)).resolves.toEqual({
      competitorId: 4,
      latestSnapshotId: 2,
      previousSnapshotId: 1,
      hasChanges: true,
      changes: [
        {
          type: 'AVAILABILITY_CHANGE',
          productId: 10,
          productName: 'Starter',
          productUrl: 'https://example.com/starter',
          currency: 'USD',
          previousAvailability: 'IN_STOCK',
          currentAvailability: 'OUT_OF_STOCK',
        },
      ],
    });
  });

  it('detects an availability change when a product returns to stock', async () => {
    prisma.snapshot.findMany.mockResolvedValue([
      snapshot(2, [
        {
          productId: 10,
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 100,
          availability: 'IN_STOCK',
        },
      ]),
      snapshot(1, [
        {
          productId: 10,
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 100,
          availability: 'OUT_OF_STOCK',
        },
      ]),
    ]);

    await expect(service.findByCompetitor(4)).resolves.toMatchObject({
      hasChanges: true,
      changes: [
        {
          type: 'AVAILABILITY_CHANGE',
          previousAvailability: 'OUT_OF_STOCK',
          currentAvailability: 'IN_STOCK',
        },
      ],
    });
  });

  it('does not create an availability change from UNKNOWN to IN_STOCK', async () => {
    prisma.snapshot.findMany.mockResolvedValue([
      snapshot(2, [
        {
          productId: 10,
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 100,
          availability: 'IN_STOCK',
        },
      ]),
      snapshot(1, [
        {
          productId: 10,
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 100,
          availability: 'UNKNOWN',
        },
      ]),
    ]);

    await expect(service.findByCompetitor(4)).resolves.toMatchObject({
      hasChanges: false,
      changes: [],
    });
  });

  it('does not create an availability change from IN_STOCK to UNKNOWN', async () => {
    prisma.snapshot.findMany.mockResolvedValue([
      snapshot(2, [
        {
          productId: 10,
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 100,
          availability: 'UNKNOWN',
        },
      ]),
      snapshot(1, [
        {
          productId: 10,
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 100,
          availability: 'IN_STOCK',
        },
      ]),
    ]);

    await expect(service.findByCompetitor(4)).resolves.toMatchObject({
      hasChanges: false,
      changes: [],
    });
  });

  it('returns product price history from existing snapshots', async () => {
    prisma.snapshot.findMany.mockResolvedValue([
      snapshot(
        4,
        [
          {
            productId: 10,
            name: 'Starter',
            url: 'https://example.com/starter',
            price: 95,
            availability: 'IN_STOCK',
          },
        ],
        {
          competitorId: 8,
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ),
      snapshot(
        5,
        [
          {
            productId: 10,
            name: 'Starter',
            url: 'https://example.com/starter',
            price: 105,
            availability: 'OUT_OF_STOCK',
          },
        ],
        {
          competitorId: 8,
          createdAt: '2026-08-02T00:00:00.000Z',
        },
      ),
    ]);

    await expect(service.getProductHistory(10)).resolves.toEqual({
      productId: 10,
      history: [
        {
          snapshotId: 4,
          competitorId: 8,
          capturedAt: new Date('2026-08-01T00:00:00.000Z'),
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 95,
          currency: 'USD',
          availability: 'IN_STOCK',
        },
        {
          snapshotId: 5,
          competitorId: 8,
          capturedAt: new Date('2026-08-02T00:00:00.000Z'),
          name: 'Starter',
          url: 'https://example.com/starter',
          price: 105,
          currency: 'USD',
          availability: 'OUT_OF_STOCK',
        },
      ],
    });
  });

  it('returns a historical competitor change log across snapshot pairs', async () => {
    prisma.snapshot.findMany.mockResolvedValue([
      snapshot(
        1,
        [
          {
            productId: 10,
            name: 'Starter',
            url: 'https://example.com/starter',
            price: 100,
            availability: 'IN_STOCK',
          },
        ],
        {
          competitorId: 4,
          createdAt: '2026-08-01T00:00:00.000Z',
        },
      ),
      snapshot(
        2,
        [
          {
            productId: 10,
            name: 'Starter',
            url: 'https://example.com/starter',
            price: 120,
            availability: 'IN_STOCK',
          },
        ],
        {
          competitorId: 4,
          createdAt: '2026-08-02T00:00:00.000Z',
        },
      ),
      snapshot(
        3,
        [
          {
            productId: 10,
            name: 'Starter',
            url: 'https://example.com/starter',
            price: 120,
            availability: 'OUT_OF_STOCK',
          },
          {
            productId: 11,
            name: 'Plus',
            url: 'https://example.com/plus',
            price: 50,
            availability: 'IN_STOCK',
          },
        ],
        {
          competitorId: 4,
          createdAt: '2026-08-03T00:00:00.000Z',
        },
      ),
    ]);

    await expect(service.getCompetitorChangeLog(4)).resolves.toEqual({
      competitorId: 4,
      entries: [
        {
          latestSnapshotId: 2,
          previousSnapshotId: 1,
          detectedAt: new Date('2026-08-02T00:00:00.000Z'),
          hasChanges: true,
          changes: [
            {
              type: 'PRICE_INCREASE',
              productId: 10,
              productName: 'Starter',
              productUrl: 'https://example.com/starter',
              previousPrice: 100,
              currentPrice: 120,
              currency: 'USD',
              priceDifference: 20,
              percentageChange: 20,
            },
          ],
        },
        {
          latestSnapshotId: 3,
          previousSnapshotId: 2,
          detectedAt: new Date('2026-08-03T00:00:00.000Z'),
          hasChanges: true,
          changes: [
            {
              type: 'AVAILABILITY_CHANGE',
              productId: 10,
              productName: 'Starter',
              productUrl: 'https://example.com/starter',
              currency: 'USD',
              previousAvailability: 'IN_STOCK',
              currentAvailability: 'OUT_OF_STOCK',
            },
            {
              type: 'NEW_PRODUCT',
              productId: 11,
              productName: 'Plus',
              productUrl: 'https://example.com/plus',
              currentPrice: 50,
              currency: 'USD',
            },
          ],
        },
      ],
    });
  });
});
