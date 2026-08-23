import { Injectable } from '@nestjs/common';
import { ownedCompetitorWhere, ownedProductWhere } from '../auth/workspace.service';
import { ChangesService } from '../changes/changes.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly changesService: ChangesService,
  ) {}

  async getSummary(userId: number) {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const owner = ownedCompetitorWhere(userId);

    const [competitors, products, reviews, competitorIds] = await Promise.all([
      this.prisma.competitor.count({ where: owner }),
      this.prisma.product.count({ where: ownedProductWhere(userId) }),
      this.prisma.review.count({
        where: { product: ownedProductWhere(userId) },
      }),
      this.prisma.competitor.findMany({
        where: owner,
        select: { id: true },
      }),
    ]);

    let changesThisWeek = 0;
    const logs = await Promise.all(
      competitorIds.map((item) =>
        this.changesService.getCompetitorChangeLog(item.id),
      ),
    );
    for (const log of logs) {
      for (const entry of log.entries) {
        if (new Date(entry.detectedAt) >= weekAgo) {
          changesThisWeek += entry.changes.length;
        }
      }
    }

    return {
      competitors,
      products,
      changesThisWeek,
      reviews,
    };
  }
}
