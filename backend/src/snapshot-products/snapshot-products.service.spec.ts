import { Test, TestingModule } from '@nestjs/testing';
import { SnapshotProductsService } from './snapshot-products.service';
import { PrismaService } from '../prisma.service';

describe('SnapshotProductsService', () => {
  let service: SnapshotProductsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SnapshotProductsService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<SnapshotProductsService>(SnapshotProductsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
