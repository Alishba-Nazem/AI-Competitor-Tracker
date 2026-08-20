import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';
import { SnapshotsService } from './snapshots.service';

@Controller('snapshots')
export class SnapshotsController {
  constructor(private readonly snapshotsService: SnapshotsService) {}

  @Post()
  create(
    @Body()
    body: {
      competitorId: number;
    },
  ) {
    return this.snapshotsService.create({
      competitorId: Number(body.competitorId),
    });
  }

  @Get()
  findAll() {
    return this.snapshotsService.findAll();
  }

  @Get('competitor/:competitorId')
  findByCompetitor(@Param('competitorId', ParseIntPipe) competitorId: number) {
    return this.snapshotsService.findByCompetitor(competitorId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.snapshotsService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.snapshotsService.remove(id);
  }
}
