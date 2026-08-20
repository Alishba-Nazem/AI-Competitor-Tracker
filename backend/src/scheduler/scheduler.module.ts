import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { ScraperModule } from '../scraper/scraper.module';
import { CompetitorTrackingService } from './competitor-tracking.service';
import { SchedulerController } from './scheduler.controller';

@Module({
  imports: [PrismaModule, ScraperModule, ReviewsModule],
  controllers: [SchedulerController],
  providers: [CompetitorTrackingService],
})
export class SchedulerModule {}
