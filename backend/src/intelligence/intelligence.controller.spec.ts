import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';

const user = { id: 7, name: 'Alish', email: 'alish@example.com' };

describe('IntelligenceController', () => {
  let controller: IntelligenceController;
  const intelligenceService = {
    getDashboard: jest.fn(),
    getMarket: jest.fn(),
    getCompetitor: jest.fn(),
    getBriefing: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntelligenceController],
      providers: [
        { provide: IntelligenceService, useValue: intelligenceService },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();
    controller = module.get(IntelligenceController);
  });

  it('returns the dashboard payload', async () => {
    const payload = { findings: [] };
    intelligenceService.getDashboard.mockResolvedValue(payload);
    await expect(controller.getDashboard(user)).resolves.toBe(payload);
    expect(intelligenceService.getDashboard).toHaveBeenCalledWith(7);
  });

  it('returns competitor intelligence', async () => {
    const payload = { competitor: { id: 3 } };
    intelligenceService.getCompetitor.mockResolvedValue(payload);
    await expect(controller.getCompetitor(user, 3)).resolves.toBe(payload);
    expect(intelligenceService.getCompetitor).toHaveBeenCalledWith(7, 3);
  });

  it('returns an AI briefing for the signed-in user', async () => {
    const payload = { source: 'fallback', headline: 'No data' };
    intelligenceService.getBriefing.mockResolvedValue(payload);
    await expect(controller.getBriefing(user)).resolves.toBe(payload);
    expect(intelligenceService.getBriefing).toHaveBeenCalledWith(7);
  });
});
