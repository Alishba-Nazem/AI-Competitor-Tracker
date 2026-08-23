import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IntelligenceService } from './intelligence.service';

@Controller('intelligence')
@UseGuards(JwtAuthGuard)
export class IntelligenceController {
  constructor(private readonly intelligenceService: IntelligenceService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: AuthUser) {
    return this.intelligenceService.getDashboard(user.id);
  }

  @Get('briefing')
  getBriefing(@CurrentUser() user: AuthUser) {
    return this.intelligenceService.getBriefing(user.id);
  }

  @Get('market')
  getMarket(@CurrentUser() user: AuthUser) {
    return this.intelligenceService.getMarket(user.id);
  }

  @Get('competitor/:competitorId')
  getCompetitor(
    @CurrentUser() user: AuthUser,
    @Param('competitorId', ParseIntPipe) competitorId: number,
  ) {
    return this.intelligenceService.getCompetitor(user.id, competitorId);
  }
}
