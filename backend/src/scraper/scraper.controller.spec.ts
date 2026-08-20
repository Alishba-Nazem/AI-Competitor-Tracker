import { Test, TestingModule } from '@nestjs/testing';
import { DiscoveryService } from './discovery.service';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';

describe('ScraperController', () => {
  let controller: ScraperController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScraperController],
      providers: [
        { provide: ScraperService, useValue: {} },
        { provide: DiscoveryService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ScraperController>(ScraperController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
