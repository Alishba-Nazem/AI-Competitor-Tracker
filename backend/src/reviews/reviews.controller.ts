import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceService } from '../auth/workspace.service';
import { ReviewScraperService } from './review-scraper.service';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly reviewScraperService: ReviewScraperService,
    private readonly workspace: WorkspaceService,
  ) {}

  @Get('competitor/:competitorId')
  async findByCompetitor(
    @CurrentUser() user: AuthUser,
    @Param('competitorId', ParseIntPipe) competitorId: number,
  ) {
    await this.workspace.assertOwnsCompetitor(user.id, competitorId);
    return this.reviewsService.findByCompetitor(competitorId);
  }

  @Get('product/:productId/summary')
  async summary(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    await this.workspace.assertOwnsProduct(user.id, productId);
    return this.reviewsService.summaryForProduct(productId);
  }

  @Get('product/:productId/insights')
  async insights(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    await this.workspace.assertOwnsProduct(user.id, productId);
    return this.reviewsService.insightsForProduct(productId);
  }

  @Get('product/:productId')
  async findByProduct(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    await this.workspace.assertOwnsProduct(user.id, productId);
    return this.reviewsService.findByProduct(productId);
  }

  @Post('product/:productId/capture')
  async captureProduct(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    await this.workspace.assertOwnsProduct(user.id, productId);
    return this.reviewScraperService.scrapeProduct(productId);
  }

  @Post('competitor/:competitorId/capture')
  async captureCompetitor(
    @CurrentUser() user: AuthUser,
    @Param('competitorId', ParseIntPipe) competitorId: number,
  ) {
    await this.workspace.assertOwnsCompetitor(user.id, competitorId);
    return this.reviewScraperService.scrapeCompetitor(competitorId);
  }
}
