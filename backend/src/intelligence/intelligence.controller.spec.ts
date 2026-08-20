import { Test, TestingModule } from '@nestjs/testing';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';

describe('IntelligenceController', () => {
  let controller: IntelligenceController;
  const intelligenceService = {
    getDashboard: jest.fn(),
    getMarket: jest.fn(),
    getCompetitor: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntelligenceController],
      providers: [
        { provide: IntelligenceService, useValue: intelligenceService },
      ],
    }).compile();
    controller = module.get(IntelligenceController);
  });

  it('returns the dashboard payload', async () => {
    const payload = { findings: [] };
    intelligenceService.getDashboard.mockResolvedValue(payload);
    await expect(controller.getDashboard()).resolves.toBe(payload);
  });

  it('returns competitor intelligence', async () => {
    const payload = { competitor: { id: 3 } };
    intelligenceService.getCompetitor.mockResolvedValue(payload);
    await expect(controller.getCompetitor(3)).resolves.toBe(payload);
  });
});
