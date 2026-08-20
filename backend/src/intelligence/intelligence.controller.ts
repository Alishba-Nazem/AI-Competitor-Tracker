import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { IntelligenceService } from './intelligence.service';

@Controller('intelligence')
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Get('dashboard')
  getDashboard() {
    return this.intelligenceService.getDashboard();
  }

  @Get('market')
  getMarket() {
    return this.intelligenceService.getMarket();
  }

  @Get('competitor/:competitorId')
  getCompetitor(
    @Param('competitorId', ParseIntPipe) competitorId: number,
  ) {
    return this.intelligenceService.getCompetitor(competitorId);
  }
}
