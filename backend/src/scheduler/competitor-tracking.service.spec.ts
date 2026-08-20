import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma.service';
import { DiscoveryService } from '../scraper/discovery.service';
import { ScraperService } from '../scraper/scraper.service';
import { ReviewScraperService } from '../reviews/review-scraper.service';
import { CompetitorTrackingService } from './competitor-tracking.service';

describe('CompetitorTrackingService', () => {
  let service: CompetitorTrackingService;
  const prisma = {
    competitor: { findMany: jest.fn() },
    captureLog: { update: jest.fn() },
  };
  const discoveryService = {
    discoverCompetitor: jest.fn(),
  };
  const reviewScraperService = {
    scrapeCompetitor: jest.fn(),
  };
  const scraperService = {
    scrapeCompetitor: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    prisma.captureLog.update.mockResolvedValue({});
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompetitorTrackingService,
        { provide: PrismaService, useValue: prisma },
        { provide: DiscoveryService, useValue: discoveryService },
        { provide: ScraperService, useValue: scraperService },
        { provide: ReviewScraperService, useValue: reviewScraperService },
      ],
    }).compile();

    service = module.get<CompetitorTrackingService>(CompetitorTrackingService);
  });

  it('processes active competitors with the existing capture logic', async () => {
    prisma.competitor.findMany.mockResolvedValue([
      { id: 1, name: 'Nike', captureFrequency: 'DAILY', lastCapturedAt: null },
      { id: 2, name: 'Adidas', captureFrequency: 'DAILY', lastCapturedAt: null },
    ]);
    discoveryService.discoverCompetitor.mockResolvedValue({});
    scraperService.scrapeCompetitor.mockResolvedValue({ captureLogId: 1 });
    reviewScraperService.scrapeCompetitor.mockResolvedValue({ created: 0 });

    await expect(service.runActiveCompetitorTracking()).resolves.toEqual({
      status: 'completed',
      processed: 2,
      failed: 0,
      skippedDue: 0,
    });
    expect(prisma.competitor.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        captureFrequency: true,
        lastCapturedAt: true,
      },
    });
    expect(discoveryService.discoverCompetitor).toHaveBeenNthCalledWith(1, 1);
    expect(discoveryService.discoverCompetitor).toHaveBeenNthCalledWith(2, 2);
    expect(scraperService.scrapeCompetitor).toHaveBeenNthCalledWith(1, 1, {
      triggeredBy: 'cron',
    });
    expect(scraperService.scrapeCompetitor).toHaveBeenNthCalledWith(2, 2, {
      triggeredBy: 'cron',
    });
  });

  it('skips inactive competitors by querying only active records', async () => {
    prisma.competitor.findMany.mockResolvedValue([
      { id: 1, name: 'Nike', captureFrequency: 'DAILY', lastCapturedAt: null },
    ]);
    discoveryService.discoverCompetitor.mockResolvedValue({});
    scraperService.scrapeCompetitor.mockResolvedValue({ captureLogId: 1 });
    reviewScraperService.scrapeCompetitor.mockResolvedValue({ created: 0 });

    await service.runActiveCompetitorTracking();

    expect(scraperService.scrapeCompetitor).toHaveBeenCalledTimes(1);
    expect(scraperService.scrapeCompetitor).toHaveBeenCalledWith(1, {
      triggeredBy: 'cron',
    });
  });

  it('skips WEEKLY competitors captured within the last 7 days', async () => {
    prisma.competitor.findMany.mockResolvedValue([
      {
        id: 1,
        name: 'Nike',
        captureFrequency: 'WEEKLY',
        lastCapturedAt: new Date(),
      },
    ]);

    await expect(service.runActiveCompetitorTracking()).resolves.toEqual({
      status: 'completed',
      processed: 0,
      failed: 0,
      skippedDue: 1,
    });
    expect(scraperService.scrapeCompetitor).not.toHaveBeenCalled();
  });

  it('continues processing after one competitor capture fails', async () => {
    prisma.competitor.findMany.mockResolvedValue([
      { id: 1, name: 'Nike', captureFrequency: 'DAILY', lastCapturedAt: null },
      { id: 2, name: 'Adidas', captureFrequency: 'DAILY', lastCapturedAt: null },
    ]);
    discoveryService.discoverCompetitor.mockResolvedValue({});
    reviewScraperService.scrapeCompetitor.mockResolvedValue({ created: 0 });
    scraperService.scrapeCompetitor
      .mockRejectedValueOnce(new Error('Price unavailable'))
      .mockResolvedValueOnce({ captureLogId: 2 });

    await expect(service.runActiveCompetitorTracking()).resolves.toEqual({
      status: 'completed',
      processed: 1,
      failed: 1,
      skippedDue: 0,
    });
    expect(scraperService.scrapeCompetitor).toHaveBeenNthCalledWith(1, 1, {
      triggeredBy: 'cron',
    });
    expect(scraperService.scrapeCompetitor).toHaveBeenNthCalledWith(2, 2, {
      triggeredBy: 'cron',
    });
  });

  it('still captures prices when product discovery fails for a competitor', async () => {
    prisma.competitor.findMany.mockResolvedValue([
      { id: 1, name: 'Nike', captureFrequency: 'DAILY', lastCapturedAt: null },
    ]);
    discoveryService.discoverCompetitor.mockRejectedValue(
      new Error('NO_PRODUCTS_FOUND'),
    );
    scraperService.scrapeCompetitor.mockResolvedValue({ captureLogId: 1 });
    reviewScraperService.scrapeCompetitor.mockResolvedValue({ created: 0 });

    await expect(service.runActiveCompetitorTracking()).resolves.toEqual({
      status: 'completed',
      processed: 1,
      failed: 0,
      skippedDue: 0,
    });
    expect(discoveryService.discoverCompetitor).toHaveBeenCalledWith(1);
    expect(scraperService.scrapeCompetitor).toHaveBeenCalledWith(1, {
      triggeredBy: 'cron',
    });
  });

  it('still completes price capture when review extraction fails', async () => {
    prisma.competitor.findMany.mockResolvedValue([
      { id: 1, name: 'Nike', captureFrequency: 'DAILY', lastCapturedAt: null },
    ]);
    discoveryService.discoverCompetitor.mockResolvedValue({});
    scraperService.scrapeCompetitor.mockResolvedValue({ captureLogId: 1 });
    reviewScraperService.scrapeCompetitor.mockRejectedValue(
      new Error('REVIEWS_FAILED'),
    );

    await expect(service.runActiveCompetitorTracking()).resolves.toEqual({
      status: 'completed',
      processed: 1,
      failed: 0,
      skippedDue: 0,
    });
    expect(scraperService.scrapeCompetitor).toHaveBeenCalledWith(1, {
      triggeredBy: 'cron',
    });
    expect(reviewScraperService.scrapeCompetitor).toHaveBeenCalledWith(1);
  });
});
