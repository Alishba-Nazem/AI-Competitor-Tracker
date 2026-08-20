import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma.service';
import { DiscoveryService } from '../scraper/discovery.service';
import { ScraperService } from '../scraper/scraper.service';
import { ReviewScraperService } from '../reviews/review-scraper.service';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class CompetitorTrackingService {
  private readonly logger = new Logger(CompetitorTrackingService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly discoveryService: DiscoveryService,
    private readonly scraperService: ScraperService,
    private readonly reviewScraperService: ReviewScraperService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'daily-competitor-tracking',
    timeZone: 'UTC',
  })
  async runDailyTracking() {
    return this.runActiveCompetitorTracking();
  }

  async runActiveCompetitorTracking() {
    if (this.isRunning) {
      this.logger.warn(
        'Competitor tracking is already running; skipping this execution.',
      );
      return { status: 'skipped', processed: 0, failed: 0, skippedDue: 0 };
    }

    this.isRunning = true;

    try {
      const competitors = await this.prisma.competitor.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          captureFrequency: true,
          lastCapturedAt: true,
        },
      });
      let processed = 0;
      let failed = 0;
      let skippedDue = 0;
      const now = Date.now();

      for (const competitor of competitors) {
        if (!this.isDue(competitor, now)) {
          skippedDue += 1;
          continue;
        }

        try {
          try {
            await this.discoveryService.discoverCompetitor(competitor.id);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `Product discovery skipped for ${competitor.name} (${competitor.id}): ${message}`,
            );
          }

          const priceResult = await this.scraperService.scrapeCompetitor(
            competitor.id,
            { triggeredBy: 'cron' },
          );

          let reviewsScraped = 0;
          try {
            const reviewResult =
              await this.reviewScraperService.scrapeCompetitor(competitor.id);
            reviewsScraped = reviewResult.created ?? 0;
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            this.logger.warn(
              `Review extraction failed for ${competitor.name} (${competitor.id}): ${message}`,
            );
          }

          if (priceResult.captureLogId) {
            await this.prisma.captureLog.update({
              where: { id: priceResult.captureLogId },
              data: { reviewsScraped },
            });
          }

          processed += 1;
        } catch (error) {
          failed += 1;
          const message =
            error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to track competitor ${competitor.name} (${competitor.id}): ${message}`,
          );
        }
      }

      return { status: 'completed', processed, failed, skippedDue };
    } finally {
      this.isRunning = false;
    }
  }

  private isDue(
    competitor: {
      captureFrequency: string;
      lastCapturedAt: Date | null;
    },
    now: number,
  ) {
    if (!competitor.lastCapturedAt) return true;
    const frequency = competitor.captureFrequency === 'WEEKLY' ? 'WEEKLY' : 'DAILY';
    if (frequency === 'DAILY') return true;
    return now - competitor.lastCapturedAt.getTime() >= WEEK_MS;
  }
}
