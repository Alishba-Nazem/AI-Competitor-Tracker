import { Test, TestingModule } from '@nestjs/testing';
import { SnapshotsService } from './snapshots.service';
import { PrismaService } from '../prisma.service';

describe('SnapshotsService', () => {
  let service: SnapshotsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SnapshotsService, { provide: PrismaService, useValue: {} }],
    }).compile();

    service = module.get<SnapshotsService>(SnapshotsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
