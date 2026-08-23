import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { CompetitorsController } from './competitors.controller';
import { CompetitorsService } from './competitors.service';

describe('CompetitorsController', () => {
  let controller: CompetitorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CompetitorsController],
      providers: [
        { provide: CompetitorsService, useValue: {} },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    controller = module.get<CompetitorsController>(CompetitorsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
