import { Controller, Post } from '@nestjs/common';
import { CompetitorTrackingService } from './competitor-tracking.service';

@Controller('scheduler')
export class SchedulerController {
  constructor(
    private readonly competitorTrackingService: CompetitorTrackingService,
  ) {}

  // Internal/test endpoint for triggering the daily tracking flow on demand.
  @Post('internal/run')
  runNow() {
    return this.competitorTrackingService.runActiveCompetitorTracking();
  }
}
