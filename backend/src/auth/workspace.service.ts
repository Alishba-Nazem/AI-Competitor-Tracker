import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

export function ownedCompetitorWhere(userId: number) {
  return { businessProfile: { userId } };
}

export function ownedProductWhere(userId: number) {
  return { competitor: { businessProfile: { userId } } };
}

@Injectable()
export class WorkspaceService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: number) {
    return this.prisma.businessProfile.findUnique({
      where: { userId },
    });
  }

  async assertOwnsCompetitor(userId: number, competitorId: number) {
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: competitorId, ...ownedCompetitorWhere(userId) },
    });
    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }
    return competitor;
  }

  async assertOwnsProduct(userId: number, productId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, ...ownedProductWhere(userId) },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async assertOwnsSnapshot(userId: number, snapshotId: number) {
    const snapshot = await this.prisma.snapshot.findFirst({
      where: {
        id: snapshotId,
        competitor: ownedCompetitorWhere(userId),
      },
    });
    if (!snapshot) {
      throw new NotFoundException('Snapshot not found');
    }
    return snapshot;
  }
}
