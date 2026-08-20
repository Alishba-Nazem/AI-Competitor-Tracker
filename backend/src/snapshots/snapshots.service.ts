import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SnapshotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { competitorId: number }) {
    const competitor = await this.prisma.competitor.findUnique({
      where: { id: data.competitorId },
    });

    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

    return this.prisma.snapshot.create({
      data: {
        competitorId: data.competitorId,
      },
    });
  }

  async findAll() {
    return this.prisma.snapshot.findMany({
      include: {
        competitor: true,
        products: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const snapshot = await this.prisma.snapshot.findUnique({
      where: { id },
      include: {
        competitor: true,
        products: true,
      },
    });

    if (!snapshot) {
      throw new NotFoundException('Snapshot not found');
    }

    return snapshot;
  }

  async findByCompetitor(competitorId: number) {
    return this.prisma.snapshot.findMany({
      where: { competitorId },
      include: {
        products: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async remove(id: number) {
    const snapshot = await this.prisma.snapshot.findUnique({
      where: { id },
    });

    if (!snapshot) {
      throw new NotFoundException('Snapshot not found');
    }

    return this.prisma.snapshot.delete({
      where: { id },
    });
  }
}
