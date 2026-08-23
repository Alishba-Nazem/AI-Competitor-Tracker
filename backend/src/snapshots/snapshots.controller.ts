import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SnapshotsService } from './snapshots.service';

@Controller('snapshots')
@UseGuards(JwtAuthGuard)
export class SnapshotsController {
  constructor(private readonly snapshotsService: SnapshotsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      competitorId: number;
    },
  ) {
    return this.snapshotsService.create(user.id, {
      competitorId: Number(body.competitorId),
    });
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.snapshotsService.findAll(user.id);
  }

  @Get('competitor/:competitorId')
  findByCompetitor(
    @CurrentUser() user: AuthUser,
    @Param('competitorId', ParseIntPipe) competitorId: number,
  ) {
    return this.snapshotsService.findByCompetitor(user.id, competitorId);
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.snapshotsService.findOne(user.id, id);
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.snapshotsService.remove(user.id, id);
  }
}
