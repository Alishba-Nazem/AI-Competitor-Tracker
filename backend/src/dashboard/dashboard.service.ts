import { Injectable } from '@nestjs/common';
import { ChangesService } from '../changes/changes.service';
import { PrismaService } from '../prisma.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly changesService: ChangesService,
  ) {}

  async getSummary() {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [competitors, products, reviews, competitorIds] = await Promise.all([
      this.prisma.competitor.count(),
      this.prisma.product.count(),
      this.prisma.review.count(),
      this.prisma.competitor.findMany({ select: { id: true } }),
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
