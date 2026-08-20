import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { isKnownAvailability } from '../scraper/availability';

export type ChangeType =
  | 'PRICE_INCREASE'
  | 'PRICE_DECREASE'
  | 'NEW_PRODUCT'
  | 'REMOVED_PRODUCT'
  | 'AVAILABILITY_CHANGE';

type SnapshotProductRecord = {
  productId: number;
  name: string;
  url: string;
  price: { toNumber(): number } | number;
  currency: string;
  availability?: string | null;
};

export type DetectedChange = {
  type: ChangeType;
  productId: number;
  productName: string;
  productUrl: string;
  previousPrice?: number;
  currentPrice?: number;
  currency: string;
  priceDifference?: number;
  percentageChange?: number | null;
  previousAvailability?: string;
  currentAvailability?: string;
};

export type ProductPriceHistoryPoint = {
  snapshotId: number;
  competitorId: number;
  capturedAt: Date;
  name: string;
  url: string;
  price: number;
  currency: string;
  availability?: string | null;
};

export type ProductPriceHistory = {
  productId: number;
  history: ProductPriceHistoryPoint[];
};

export type CompetitorChangeLogEntry = {
  latestSnapshotId: number;
  previousSnapshotId: number;
  detectedAt: Date;
  hasChanges: boolean;
  changes: DetectedChange[];
};

export type CompetitorChangeLog = {
  competitorId: number;
  entries: CompetitorChangeLogEntry[];
};

@Injectable()
export class ChangesService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCompetitor(competitorId: number) {
    const snapshots = await this.prisma.snapshot.findMany({
      where: { competitorId },
      include: { products: true },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
    });

    const latestSnapshot = snapshots[0];
    const previousSnapshot = snapshots[1];

    if (!latestSnapshot || !previousSnapshot) {
      return {
        competitorId,
        latestSnapshotId: latestSnapshot?.id ?? null,
        previousSnapshotId: null,
        hasChanges: false,
        changes: [] as DetectedChange[],
      };
    }

    const previousProducts = new Map(
      previousSnapshot.products.map((product) => [product.productId, product]),
    );
    const latestProducts = new Map(
      latestSnapshot.products.map((product) => [product.productId, product]),
    );
    const changes: DetectedChange[] = [];

    for (const product of latestSnapshot.products) {
      const previousProduct = previousProducts.get(product.productId);

      if (!previousProduct) {
        changes.push(this.createNewProductChange(product));
        continue;
      }

      const priceChange = this.createPriceChange(product, previousProduct);
      if (priceChange) {
        changes.push(priceChange);
      }

      const availabilityChange = this.createAvailabilityChange(
        product,
        previousProduct,
      );
      if (availabilityChange) {
        changes.push(availabilityChange);
      }
    }

    for (const product of previousSnapshot.products) {
      if (!latestProducts.has(product.productId)) {
        changes.push(this.createRemovedProductChange(product));
      }
    }

    return {
      competitorId,
      latestSnapshotId: latestSnapshot.id,
      previousSnapshotId: previousSnapshot.id,
      hasChanges: changes.length > 0,
      changes,
    };
  }

  async getProductHistory(productId: number): Promise<ProductPriceHistory> {
    const snapshots = await this.prisma.snapshot.findMany({
      where: { products: { some: { productId } } },
      include: {
        products: {
          where: { productId },
        },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    return {
      productId,
      history: snapshots.flatMap((snapshot) => {
        const product = snapshot.products[0];
        if (!product) return [];
        return [
          {
            snapshotId: snapshot.id,
            competitorId: snapshot.competitorId,
            capturedAt: snapshot.createdAt,
            name: product.name,
            url: product.url,
            price: this.toNumber(product.price),
            currency: product.currency,
            availability: product.availability ?? null,
          },
        ];
      }),
    };
  }

  async getCompetitorChangeLog(
    competitorId: number,
  ): Promise<CompetitorChangeLog> {
    const snapshots = await this.prisma.snapshot.findMany({
      where: { competitorId },
      include: { products: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });

    const entries: CompetitorChangeLogEntry[] = [];
    for (let index = 1; index < snapshots.length; index += 1) {
      const previousSnapshot = snapshots[index - 1];
      const latestSnapshot = snapshots[index];
      const changes = this.detectChanges(latestSnapshot.products, previousSnapshot.products);
      if (changes.length === 0) continue;
      entries.push({
        latestSnapshotId: latestSnapshot.id,
        previousSnapshotId: previousSnapshot.id,
        detectedAt: latestSnapshot.createdAt,
        hasChanges: true,
        changes,
      });
    }

    return {
      competitorId,
      entries,
    };
  }

  private detectChanges(
    latestSnapshotProducts: SnapshotProductRecord[],
    previousSnapshotProducts: SnapshotProductRecord[],
  ) {
    const previousProducts = new Map(
      previousSnapshotProducts.map((product) => [product.productId, product]),
    );
    const latestProducts = new Map(
      latestSnapshotProducts.map((product) => [product.productId, product]),
    );
    const changes: DetectedChange[] = [];

    for (const product of latestSnapshotProducts) {
      const previousProduct = previousProducts.get(product.productId);

      if (!previousProduct) {
        changes.push(this.createNewProductChange(product));
        continue;
      }

      const priceChange = this.createPriceChange(product, previousProduct);
      if (priceChange) {
        changes.push(priceChange);
      }

      const availabilityChange = this.createAvailabilityChange(
        product,
        previousProduct,
      );
      if (availabilityChange) {
        changes.push(availabilityChange);
      }
    }

    for (const product of previousSnapshotProducts) {
      if (!latestProducts.has(product.productId)) {
        changes.push(this.createRemovedProductChange(product));
      }
    }

    return changes;
  }

  private createPriceChange(
    currentProduct: SnapshotProductRecord,
    previousProduct: SnapshotProductRecord,
  ): DetectedChange | undefined {
    const previousPrice = this.toNumber(previousProduct.price);
    const currentPrice = this.toNumber(currentProduct.price);

    if (currentPrice === previousPrice) {
      return undefined;
    }

    const signedDifference = currentPrice - previousPrice;

    return {
      type: signedDifference > 0 ? 'PRICE_INCREASE' : 'PRICE_DECREASE',
      productId: currentProduct.productId,
      productName: currentProduct.name,
      productUrl: currentProduct.url,
      previousPrice,
      currentPrice,
      currency: currentProduct.currency,
      priceDifference: this.round(Math.abs(signedDifference)),
      percentageChange:
        previousPrice === 0
          ? null
          : this.round((signedDifference / previousPrice) * 100),
    };
  }

  private createAvailabilityChange(
    currentProduct: SnapshotProductRecord,
    previousProduct: SnapshotProductRecord,
  ): DetectedChange | undefined {
    const previousAvailability = previousProduct.availability ?? undefined;
    const currentAvailability = currentProduct.availability ?? undefined;
    if (
      !isKnownAvailability(previousAvailability) ||
      !isKnownAvailability(currentAvailability)
    ) {
      return undefined;
    }
    if (previousAvailability === currentAvailability) {
      return undefined;
    }

    return {
      type: 'AVAILABILITY_CHANGE',
      productId: currentProduct.productId,
      productName: currentProduct.name,
      productUrl: currentProduct.url,
      currency: currentProduct.currency,
      previousAvailability,
      currentAvailability,
    };
  }

  private createNewProductChange(
    product: SnapshotProductRecord,
  ): DetectedChange {
    return {
      type: 'NEW_PRODUCT',
      productId: product.productId,
      productName: product.name,
      productUrl: product.url,
      currentPrice: this.toNumber(product.price),
      currency: product.currency,
    };
  }

  private createRemovedProductChange(
    product: SnapshotProductRecord,
  ): DetectedChange {
    return {
      type: 'REMOVED_PRODUCT',
      productId: product.productId,
      productName: product.name,
      productUrl: product.url,
      previousPrice: this.toNumber(product.price),
      currency: product.currency,
    };
  }

  private toNumber(value: SnapshotProductRecord['price']) {
    return typeof value === 'number' ? value : value.toNumber();
  }

  private round(value: number) {
    return Number(value.toFixed(2));
  }
}
