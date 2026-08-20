import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { DarazReviewAdapter } from './daraz-review.adapter';
import { ReviewScraperService } from './review-scraper.service';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ShopifyReviewAdapter } from './shopify-review.adapter';

@Module({
  imports: [PrismaModule],
  controllers: [ReviewsController],
  providers: [
    ReviewsService,
    ReviewScraperService,
    DarazReviewAdapter,
    ShopifyReviewAdapter,
  ],
  exports: [ReviewScraperService, ReviewsService],
})
export class ReviewsModule {}
