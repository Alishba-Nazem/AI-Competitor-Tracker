import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceService } from '../auth/workspace.service';
import { ScraperService } from './scraper.service';
import { DiscoveryService } from './discovery.service';

@Controller('scraper')
@UseGuards(JwtAuthGuard)
export class ScraperController {
  constructor(
    private readonly scraperService: ScraperService,
    private readonly discoveryService: DiscoveryService,
    private readonly workspace: WorkspaceService,
  ) {}

  @Post('test')
  async testScraper(@Body('url') url: string) {
    if (!url) {
      throw new Error('URL is required.');
    }

    return this.scraperService.scrapeUrl(url);
  }

  @Post('competitor/:id/discover')
  async discoverCompetitor(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.workspace.assertOwnsCompetitor(user.id, id);
    return this.discoveryService.discoverCompetitor(id);
  }

  @Post('competitor/:id')
  async scrapeCompetitor(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    await this.workspace.assertOwnsCompetitor(user.id, id);
    return this.scraperService.scrapeCompetitor(id, { triggeredBy: 'manual' });
  }
}

@Controller('scrape-progress')
@UseGuards(JwtAuthGuard)
export class ScrapeProgressController {
  constructor(
    private readonly scraperService: ScraperService,
    private readonly workspace: WorkspaceService,
  ) {}

  @Get(':competitorId')
  async getProgress(
    @CurrentUser() user: AuthUser,
    @Param('competitorId', ParseIntPipe) competitorId: number,
  ) {
    await this.workspace.assertOwnsCompetitor(user.id, competitorId);
    return this.scraperService.getProgress(competitorId);
  }
}
