import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ChangesService } from './changes.service';

@Controller('changes')
export class ChangesController {
  constructor(private readonly changesService: ChangesService) {}

  @Get('product/:productId/history')
  getProductHistory(@Param('productId', ParseIntPipe) productId: number) {
    return this.changesService.getProductHistory(productId);
  }

  @Get('competitor/:competitorId')
  findByCompetitor(@Param('competitorId', ParseIntPipe) competitorId: number) {
    return this.changesService.findByCompetitor(competitorId);
  }

  @Get('competitor/:competitorId/log')
  getCompetitorChangeLog(
    @Param('competitorId', ParseIntPipe) competitorId: number,
  ) {
    return this.changesService.getCompetitorChangeLog(competitorId);
  }
}
