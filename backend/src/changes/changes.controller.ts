import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WorkspaceService } from '../auth/workspace.service';
import { ChangesService } from './changes.service';

@Controller('changes')
@UseGuards(JwtAuthGuard)
export class ChangesController {
  constructor(
    private readonly changesService: ChangesService,
    private readonly workspace: WorkspaceService,
  ) {}

  @Get('product/:productId/history')
  async getProductHistory(
    @CurrentUser() user: AuthUser,
    @Param('productId', ParseIntPipe) productId: number,
  ) {
    await this.workspace.assertOwnsProduct(user.id, productId);
    return this.changesService.getProductHistory(productId);
  }

  @Get('competitor/:competitorId')
  async findByCompetitor(
    @CurrentUser() user: AuthUser,
    @Param('competitorId', ParseIntPipe) competitorId: number,
  ) {
    await this.workspace.assertOwnsCompetitor(user.id, competitorId);
    return this.changesService.findByCompetitor(competitorId);
  }

  @Get('competitor/:competitorId/log')
  async getCompetitorChangeLog(
    @CurrentUser() user: AuthUser,
    @Param('competitorId', ParseIntPipe) competitorId: number,
  ) {
    await this.workspace.assertOwnsCompetitor(user.id, competitorId);
    return this.changesService.getCompetitorChangeLog(competitorId);
  }
}
