import { Test, TestingModule } from '@nestjs/testing';
import { SnapshotsController } from './snapshots.controller';
import { SnapshotsService } from './snapshots.service';

describe('SnapshotsController', () => {
  let controller: SnapshotsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SnapshotsController],
      providers: [{ provide: SnapshotsService, useValue: {} }],
    }).compile();

    controller = module.get<SnapshotsController>(SnapshotsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
