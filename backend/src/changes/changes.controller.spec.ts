import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { WorkspaceService } from '../auth/workspace.service';
import { ChangesController } from './changes.controller';
import { ChangesService } from './changes.service';

const user = { id: 7, name: 'Alish', email: 'alish@example.com' };

describe('ChangesController', () => {
  let controller: ChangesController;

  const changesService = {
    findByCompetitor: jest.fn(),
    getProductHistory: jest.fn(),
    getCompetitorChangeLog: jest.fn(),
  };
  const workspace = {
    assertOwnsCompetitor: jest.fn(),
    assertOwnsProduct: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChangesController],
      providers: [
        { provide: ChangesService, useValue: changesService },
        { provide: WorkspaceService, useValue: workspace },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ChangesController>(ChangesController);
  });

  it('returns product price history', async () => {
    const response = {
      productId: 10,
      history: [],
    };
    changesService.getProductHistory.mockResolvedValue(response);

    await expect(controller.getProductHistory(user, 10)).resolves.toBe(response);
    expect(workspace.assertOwnsProduct).toHaveBeenCalledWith(7, 10);
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

    await expect(controller.findByCompetitor(user, 4)).resolves.toBe(response);
    expect(workspace.assertOwnsCompetitor).toHaveBeenCalledWith(7, 4);
    expect(changesService.findByCompetitor).toHaveBeenCalledWith(4);
  });

  it('returns the historical competitor change log', async () => {
    const response = {
      competitorId: 4,
      entries: [],
    };
    changesService.getCompetitorChangeLog.mockResolvedValue(response);

    await expect(controller.getCompetitorChangeLog(user, 4)).resolves.toBe(
      response,
    );
    expect(workspace.assertOwnsCompetitor).toHaveBeenCalledWith(7, 4);
    expect(changesService.getCompetitorChangeLog).toHaveBeenCalledWith(4);
  });
});
