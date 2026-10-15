import { Controller, Post, UseGuards } from '@nestjs/common';
import { CompetitorTrackingService } from './competitor-tracking.service';
import { SchedulerSecretGuard } from './scheduler-secret.guard';

@Controller('scheduler')
export class SchedulerController {
  constructor(
    private readonly competitorTrackingService: CompetitorTrackingService,
  ) {}

  // Operator-only. Daily capture still runs via @Cron and does not use HTTP.
  // Without a shared secret this recaptured every tenant's catalog.
  @Post('internal/run')
  @UseGuards(SchedulerSecretGuard)
  runNow() {
    return this.competitorTrackingService.runActiveCompetitorTracking();
  }
}
