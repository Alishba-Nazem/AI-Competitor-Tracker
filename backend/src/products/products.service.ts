import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ownedCompetitorWhere,
  ownedProductWhere,
} from '../auth/workspace.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: number,
    data: {
      competitorId: number;
      name: string;
      url: string;
      currentPrice: number;
      currency: string;
    },
  ) {
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: data.competitorId, ...ownedCompetitorWhere(userId) },
    });
    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    return this.prisma.product.create({
      data: {
        competitorId: data.competitorId,
        name: data.name,
        url: data.url,
        currentPrice: data.currentPrice,
        currency: data.currency,
      },
    });
  }

  async findAll(userId: number, competitorId?: number) {
    if (competitorId) {
      const competitor = await this.prisma.competitor.findFirst({
        where: { id: competitorId, ...ownedCompetitorWhere(userId) },
        select: { id: true },
      });
      if (!competitor) {
        throw new NotFoundException('Competitor not found');
      }
    }

    return this.prisma.product.findMany({
      where: {
        ...ownedProductWhere(userId),
        ...(competitorId ? { competitorId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: number, id: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, ...ownedProductWhere(userId) },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    userId: number,
    id: number,
    data: {
      name?: string;
      url?: string;
      currentPrice?: number;
      currency?: string;
    },
  ) {
    await this.findOne(userId, id);

    // Only persist editable scalars. Passing the request body through to Prisma
    // would allow competitorId / nested relation writes (cross-tenant moves).
    const next: {
      name?: string;
      url?: string;
      currentPrice?: number;
      currency?: string;
    } = {};
    if (data.name !== undefined) next.name = data.name;
    if (data.url !== undefined) next.url = data.url;
    if (data.currentPrice !== undefined) next.currentPrice = data.currentPrice;
    if (data.currency !== undefined) next.currency = data.currency;

    return this.prisma.product.update({
      where: { id },
      data: next,
    });
  }

  async remove(userId: number, id: number) {
    await this.findOne(userId, id);

    return this.prisma.product.delete({
      where: { id },
    });
  }
}
