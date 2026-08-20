import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SnapshotProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    snapshotId: number;
    productId: number;
    name: string;
    url: string;
    price: number;
    currency: string;
  }) {
    const snapshot = await this.prisma.snapshot.findUnique({
      where: { id: data.snapshotId },
    });

    if (!snapshot) {
      throw new NotFoundException('Snapshot not found');
    }

    const product = await this.prisma.product.findUnique({
      where: { id: data.productId },
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

  async findAll(snapshotId?: number) {
    return this.prisma.snapshotProduct.findMany({
      where: snapshotId ? { snapshotId } : undefined,
      orderBy: { id: 'desc' },
    });
  }
  async remove(id: number) {
    const snapshotProduct = await this.prisma.snapshotProduct.findUnique({
      where: { id },
    });

    if (!snapshotProduct) {
      throw new NotFoundException('Snapshot product not found');
    }

    return this.prisma.snapshotProduct.delete({
      where: { id },
    });
  }
}
