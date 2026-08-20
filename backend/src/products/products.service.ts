import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    competitorId: number;
    name: string;
    url: string;
    currentPrice: number;
    currency: string;
  }) {
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

  async findAll(competitorId?: number) {
    return this.prisma.product.findMany({
      where: competitorId ? { competitorId } : undefined,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(
    id: number,
    data: {
      name?: string;
      url?: string;
      currentPrice?: number;
      currency?: string;
    },
  ) {
    await this.findOne(id);

    return this.prisma.product.update({
      where: { id },
      data,
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.product.delete({
      where: { id },
    });
  }
}
