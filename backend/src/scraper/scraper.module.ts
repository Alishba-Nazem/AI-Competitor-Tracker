import { Module } from '@nestjs/common';
import {
  ScraperController,
  ScrapeProgressController,
} from './scraper.controller';
import { ScraperService } from './scraper.service';
import { DiscoveryService } from './discovery.service';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ScraperController, ScrapeProgressController],
  providers: [ScraperService, DiscoveryService],
  exports: [ScraperService, DiscoveryService],
})
export class ScraperModule {}
