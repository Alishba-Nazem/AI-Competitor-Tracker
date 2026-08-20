import { Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ReviewScraperService } from './review-scraper.service';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly reviewScraperService: ReviewScraperService,
  ) {}

  @Get('competitor/:competitorId')
  findByCompetitor(@Param('competitorId', ParseIntPipe) competitorId: number) {
    return this.reviewsService.findByCompetitor(competitorId);
  }

  @Get('product/:productId/summary')
  summary(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewsService.summaryForProduct(productId);
  }

  @Get('product/:productId/insights')
  insights(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewsService.insightsForProduct(productId);
  }

  @Get('product/:productId')
  findByProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewsService.findByProduct(productId);
  }

  @Post('product/:productId/capture')
  captureProduct(@Param('productId', ParseIntPipe) productId: number) {
    return this.reviewScraperService.scrapeProduct(productId);
  }

  @Post('competitor/:competitorId/capture')
  captureCompetitor(@Param('competitorId', ParseIntPipe) competitorId: number) {
    return this.reviewScraperService.scrapeCompetitor(competitorId);
  }
}
