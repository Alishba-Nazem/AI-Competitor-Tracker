import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma.service';

/**
 * End-to-end verification of Price Changes against a real database.
 * Creates temporary competitor/product/snapshot rows only, then deletes them.
 * Does not modify scraper logic or permanent production records.
 */
describe('Price Changes (e2e)', () => {
  jest.setTimeout(60000);

  let app: INestApplication<App>;
  let prisma: PrismaService;
  let competitorId: number | undefined;

  const productName = 'E2E Price Changes Probe Product';
  const productUrl = 'https://example.test/e2e-price-changes-probe';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await cleanupTemporaryCompetitor();
  });

  afterAll(async () => {
    await cleanupTemporaryCompetitor();
    await prisma.$disconnect().catch(() => undefined);
    await app.close();
  });

  async function cleanupTemporaryCompetitor() {
    if (!competitorId) {
      return;
    }

    const id = competitorId;
    competitorId = undefined;

    await prisma.competitor.delete({ where: { id } }).catch(() => undefined);
  }

  async function createCompetitorWithProduct() {
    const competitor = await prisma.competitor.create({
      data: {
        name: `E2E Price Changes ${Date.now()}`,
        url: 'https://example.test/e2e-price-changes',
        isActive: true,
      },
    });
    competitorId = competitor.id;

    const product = await prisma.product.create({
      data: {
        competitorId: competitor.id,
        name: productName,
        url: productUrl,
        currentPrice: 0,
        currency: 'PKR',
      },
    });

    return { competitor, product };
  }

  async function createSnapshotWithProduct(params: {
    competitorId: number;
    productId: number;
    price: number;
    currency: string;
    createdAt: Date;
  }) {
    const snapshot = await prisma.snapshot.create({
      data: {
        competitorId: params.competitorId,
        createdAt: params.createdAt,
      },
    });

    await prisma.snapshotProduct.create({
      data: {
        snapshotId: snapshot.id,
        productId: params.productId,
        name: productName,
        url: productUrl,
        price: params.price,
        currency: params.currency,
      },
    });

    return snapshot;
  }

  it('detects exactly one PRICE_DECREASE between snapshot #1 and #2', async () => {
    const { competitor, product } = await createCompetitorWithProduct();

    const snapshot1 = await createSnapshotWithProduct({
      competitorId: competitor.id,
      productId: product.id,
      price: 80999,
      currency: 'PKR',
      createdAt: new Date('2026-08-01T10:00:00.000Z'),
    });
    const snapshot2 = await createSnapshotWithProduct({
      competitorId: competitor.id,
      productId: product.id,
      price: 79999,
      currency: 'PKR',
      createdAt: new Date('2026-08-02T10:00:00.000Z'),
    });

    const response = await request(app.getHttpServer())
      .get(`/changes/competitor/${competitor.id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      competitorId: competitor.id,
      latestSnapshotId: snapshot2.id,
      previousSnapshotId: snapshot1.id,
      hasChanges: true,
    });
    expect(response.body.changes).toHaveLength(1);
    expect(response.body.changes[0]).toMatchObject({
      type: 'PRICE_DECREASE',
      productId: product.id,
      productName,
      productUrl,
      previousPrice: 80999,
      currentPrice: 79999,
      currency: 'PKR',
      // Existing API stores absolute magnitude, not a signed delta.
      priceDifference: 1000,
      percentageChange: -1.23,
    });
  });

  it('detects PRICE_INCREASE when the latest snapshot is higher', async () => {
    const { competitor, product } = await createCompetitorWithProduct();

    const snapshot1 = await createSnapshotWithProduct({
      competitorId: competitor.id,
      productId: product.id,
      price: 79999,
      currency: 'PKR',
      createdAt: new Date('2026-08-03T10:00:00.000Z'),
    });
    const snapshot2 = await createSnapshotWithProduct({
      competitorId: competitor.id,
      productId: product.id,
      price: 81999,
      currency: 'PKR',
      createdAt: new Date('2026-08-04T10:00:00.000Z'),
    });

    const response = await request(app.getHttpServer())
      .get(`/changes/competitor/${competitor.id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      competitorId: competitor.id,
      latestSnapshotId: snapshot2.id,
      previousSnapshotId: snapshot1.id,
      hasChanges: true,
    });
    expect(response.body.changes).toHaveLength(1);
    expect(response.body.changes[0]).toMatchObject({
      type: 'PRICE_INCREASE',
      productId: product.id,
      productName,
      previousPrice: 79999,
      currentPrice: 81999,
      currency: 'PKR',
      priceDifference: 2000,
      percentageChange: 2.5,
    });
  });

  it('detects NEW_PRODUCT and REMOVED_PRODUCT across consecutive snapshots', async () => {
    const { competitor, product } = await createCompetitorWithProduct();

    const keptProduct = product;
    const removedProduct = await prisma.product.create({
      data: {
        competitorId: competitor.id,
        name: 'E2E Removed Product',
        url: 'https://example.test/e2e-removed',
        currentPrice: 0,
        currency: 'PKR',
      },
    });
    const newProduct = await prisma.product.create({
      data: {
        competitorId: competitor.id,
        name: 'E2E New Product',
        url: 'https://example.test/e2e-new',
        currentPrice: 0,
        currency: 'PKR',
      },
    });

    const snapshot1 = await prisma.snapshot.create({
      data: {
        competitorId: competitor.id,
        createdAt: new Date('2026-08-05T10:00:00.000Z'),
        products: {
          create: [
            {
              productId: keptProduct.id,
              name: keptProduct.name,
              url: keptProduct.url,
              price: 50000,
              currency: 'PKR',
            },
            {
              productId: removedProduct.id,
              name: removedProduct.name,
              url: removedProduct.url,
              price: 12000,
              currency: 'PKR',
            },
          ],
        },
      },
    });

    const snapshot2 = await prisma.snapshot.create({
      data: {
        competitorId: competitor.id,
        createdAt: new Date('2026-08-06T10:00:00.000Z'),
        products: {
          create: [
            {
              productId: keptProduct.id,
              name: keptProduct.name,
              url: keptProduct.url,
              price: 50000,
              currency: 'PKR',
            },
            {
              productId: newProduct.id,
              name: newProduct.name,
              url: newProduct.url,
              price: 15000,
              currency: 'PKR',
            },
          ],
        },
      },
    });

    const response = await request(app.getHttpServer())
      .get(`/changes/competitor/${competitor.id}`)
      .expect(200);

    expect(response.body).toMatchObject({
      competitorId: competitor.id,
      latestSnapshotId: snapshot2.id,
      previousSnapshotId: snapshot1.id,
      hasChanges: true,
    });

    const types = response.body.changes
      .map((change: { type: string }) => change.type)
      .sort();
    expect(types).toEqual(['NEW_PRODUCT', 'REMOVED_PRODUCT']);

    expect(response.body.changes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'NEW_PRODUCT',
          productId: newProduct.id,
          productName: 'E2E New Product',
          currentPrice: 15000,
          currency: 'PKR',
        }),
        expect.objectContaining({
          type: 'REMOVED_PRODUCT',
          productId: removedProduct.id,
          productName: 'E2E Removed Product',
          previousPrice: 12000,
          currency: 'PKR',
        }),
      ]),
    );
  });
});
