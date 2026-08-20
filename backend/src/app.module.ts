import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CompetitorsModule } from './competitors/competitors.module';
import { PrismaModule } from './prisma.module.js';
import { ProductsModule } from './products/products.module';
import { SnapshotsModule } from './snapshots/snapshots.module';
import { SnapshotProductsModule } from './snapshot-products/snapshot-products.module';
import { ScraperModule } from './scraper/scraper.module';
import { ChangesModule } from './changes/changes.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ReviewsModule } from './reviews/reviews.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { IntelligenceModule } from './intelligence/intelligence.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    CompetitorsModule,
    ProductsModule,
    SnapshotsModule,
    SnapshotProductsModule,
    ScraperModule,
    ChangesModule,
    ReviewsModule,
    SchedulerModule,
    OnboardingModule,
    IntelligenceModule,
    DashboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
