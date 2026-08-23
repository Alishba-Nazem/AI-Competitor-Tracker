import { Injectable, NotFoundException } from '@nestjs/common';
import { ownedCompetitorWhere, ownedProductWhere } from '../auth/workspace.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SnapshotProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: number,
    data: {
      snapshotId: number;
      productId: number;
      name: string;
      url: string;
      price: number;
      currency: string;
    },
  ) {
    const snapshot = await this.prisma.snapshot.findFirst({
      where: {
        id: data.snapshotId,
        competitor: ownedCompetitorWhere(userId),
      },
    });

    if (!snapshot) {
      throw new NotFoundException('Snapshot not found');
    }

    const product = await this.prisma.product.findFirst({
      where: { id: data.productId, ...ownedProductWhere(userId) },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.snapshotProduct.create({
      data: {
        snapshotId: data.snapshotId,
        productId: data.productId,
        name: data.name,
        url: data.url,
        price: data.price,
        currency: data.currency,
      },
    });
  }

  async findAll(userId: number, snapshotId?: number) {
    if (snapshotId) {
      const snapshot = await this.prisma.snapshot.findFirst({
        where: { id: snapshotId, competitor: ownedCompetitorWhere(userId) },
        select: { id: true },
      });
      if (!snapshot) {
        throw new NotFoundException('Snapshot not found');
      }
    }

    return this.prisma.snapshotProduct.findMany({
      where: {
        snapshot: { competitor: ownedCompetitorWhere(userId) },
        ...(snapshotId ? { snapshotId } : {}),
      },
      orderBy: { id: 'desc' },
    });
  }

  async remove(userId: number, id: number) {
    const snapshotProduct = await this.prisma.snapshotProduct.findFirst({
      where: {
        id,
        snapshot: { competitor: ownedCompetitorWhere(userId) },
      },
    });

    if (!snapshotProduct) {
      throw new NotFoundException('Snapshot product not found');
    }

    return this.prisma.snapshotProduct.delete({
      where: { id },
    });
  }
}
