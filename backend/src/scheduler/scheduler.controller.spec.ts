import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { SchedulerController } from './scheduler.controller';
import { CompetitorTrackingService } from './competitor-tracking.service';

describe('SchedulerController', () => {
  let app: INestApplication;
  const original = process.env.SCHEDULER_SECRET;
  const competitorTrackingService = {
    runActiveCompetitorTracking: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    competitorTrackingService.runActiveCompetitorTracking.mockResolvedValue({
      status: 'completed',
      processed: 2,
      failed: 0,
      skippedDue: 0,
    });
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SchedulerController],
      providers: [
        {
          provide: CompetitorTrackingService,
          useValue: competitorTrackingService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    if (original === undefined) {
      delete process.env.SCHEDULER_SECRET;
    } else {
      process.env.SCHEDULER_SECRET = original;
    }
  });

  it('does not recapture catalogs when called without a secret', async () => {
    delete process.env.SCHEDULER_SECRET;

    await request(app.getHttpServer())
      .post('/scheduler/internal/run')
      .expect(401);

    expect(
      competitorTrackingService.runActiveCompetitorTracking,
    ).not.toHaveBeenCalled();
  });

  it('does not recapture catalogs when the secret is wrong', async () => {
    process.env.SCHEDULER_SECRET = 'operator-secret';

    await request(app.getHttpServer())
      .post('/scheduler/internal/run')
      .set('x-scheduler-secret', 'guess')
      .expect(401);

    expect(
      competitorTrackingService.runActiveCompetitorTracking,
    ).not.toHaveBeenCalled();
  });

  it('runs tracking when the operator secret matches', async () => {
    process.env.SCHEDULER_SECRET = 'operator-secret';

    const response = await request(app.getHttpServer())
      .post('/scheduler/internal/run')
      .set('x-scheduler-secret', 'operator-secret')
      .expect(201);

    expect(response.body).toEqual({
      status: 'completed',
      processed: 2,
      failed: 0,
      skippedDue: 0,
    });
    expect(
      competitorTrackingService.runActiveCompetitorTracking,
    ).toHaveBeenCalledTimes(1);
  });
});
