import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Param,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SnapshotProductsService } from './snapshot-products.service';

@Controller('snapshot-products')
@UseGuards(JwtAuthGuard)
export class SnapshotProductsController {
  constructor(
    private readonly snapshotProductsService: SnapshotProductsService,
  ) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      snapshotId: number;
      productId: number;
      name: string;
      url: string;
      price: number;
      currency: string;
    },
  ) {
    return this.snapshotProductsService.create(user.id, body);
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('snapshotId') snapshotId?: string,
  ) {
    return this.snapshotProductsService.findAll(
      user.id,
      snapshotId ? Number(snapshotId) : undefined,
    );
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.snapshotProductsService.remove(user.id, Number(id));
  }
}
