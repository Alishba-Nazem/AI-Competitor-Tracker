import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { DiscoveryService } from './discovery.service';

@Controller('scraper')
export class ScraperController {
  constructor(
    private readonly scraperService: ScraperService,
    private readonly discoveryService: DiscoveryService,
  ) {}

  @Post('test')
  async testScraper(@Body('url') url: string) {
    if (!url) {
      throw new Error('URL is required.');
    }

    return this.scraperService.scrapeUrl(url);
  }

  @Post('competitor/:id/discover')
  async discoverCompetitor(@Param('id', ParseIntPipe) id: number) {
    return this.discoveryService.discoverCompetitor(id);
  }

  @Post('competitor/:id')
  async scrapeCompetitor(@Param('id', ParseIntPipe) id: number) {
    return this.scraperService.scrapeCompetitor(id, { triggeredBy: 'manual' });
  }
}

@Controller('scrape-progress')
export class ScrapeProgressController {
  constructor(private readonly scraperService: ScraperService) {}

  @Get(':competitorId')
  getProgress(@Param('competitorId', ParseIntPipe) competitorId: number) {
    return this.scraperService.getProgress(competitorId);
  }
}
