import { Test, TestingModule } from '@nestjs/testing';
import { ChangesController } from './changes.controller';
import { ChangesService } from './changes.service';

describe('ChangesController', () => {
  let controller: ChangesController;

  const changesService = {
    findByCompetitor: jest.fn(),
    getProductHistory: jest.fn(),
    getCompetitorChangeLog: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChangesController],
      providers: [{ provide: ChangesService, useValue: changesService }],
    }).compile();

    controller = module.get<ChangesController>(ChangesController);
  });

  it('returns product price history', async () => {
    const response = {
      productId: 10,
      history: [],
    };
    changesService.getProductHistory.mockResolvedValue(response);

    await expect(controller.getProductHistory(10)).resolves.toBe(response);
    expect(changesService.getProductHistory).toHaveBeenCalledWith(10);
  });

  it('returns the latest competitor changes', async () => {
    const response = {
      competitorId: 4,
      latestSnapshotId: 2,
      previousSnapshotId: 1,
      hasChanges: false,
      changes: [],
    };
    changesService.findByCompetitor.mockResolvedValue(response);

    await expect(controller.findByCompetitor(4)).resolves.toBe(response);
    expect(changesService.findByCompetitor).toHaveBeenCalledWith(4);
  });

  it('returns the historical competitor change log', async () => {
    const response = {
      competitorId: 4,
      entries: [],
    };
    changesService.getCompetitorChangeLog.mockResolvedValue(response);

    await expect(controller.getCompetitorChangeLog(4)).resolves.toBe(response);
    expect(changesService.getCompetitorChangeLog).toHaveBeenCalledWith(4);
  });
});
