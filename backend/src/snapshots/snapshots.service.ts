import { Injectable, NotFoundException } from '@nestjs/common';
import { ownedCompetitorWhere } from '../auth/workspace.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class SnapshotsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, data: { competitorId: number }) {
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: data.competitorId, ...ownedCompetitorWhere(userId) },
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

  async findAll(userId: number) {
    return this.prisma.snapshot.findMany({
      where: { competitor: ownedCompetitorWhere(userId) },
      include: {
        competitor: true,
        products: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(userId: number, id: number) {
    const snapshot = await this.prisma.snapshot.findFirst({
      where: { id, competitor: ownedCompetitorWhere(userId) },
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

  async findByCompetitor(userId: number, competitorId: number) {
    const competitor = await this.prisma.competitor.findFirst({
      where: { id: competitorId, ...ownedCompetitorWhere(userId) },
      select: { id: true },
    });
    if (!competitor) {
      throw new NotFoundException('Competitor not found');
    }

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

  async remove(userId: number, id: number) {
    await this.findOne(userId, id);

    return this.prisma.snapshot.delete({
      where: { id },
    });
  }
}
