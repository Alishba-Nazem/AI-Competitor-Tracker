import { Test, TestingModule } from '@nestjs/testing';
import { SnapshotProductsController } from './snapshot-products.controller';
import { SnapshotProductsService } from './snapshot-products.service';

describe('SnapshotProductsController', () => {
  let controller: SnapshotProductsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SnapshotProductsController],
      providers: [{ provide: SnapshotProductsService, useValue: {} }],
    }).compile();

    controller = module.get<SnapshotProductsController>(
      SnapshotProductsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
