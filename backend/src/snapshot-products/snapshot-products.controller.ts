import {
  Body,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Param,
} from '@nestjs/common';
import { SnapshotProductsService } from './snapshot-products.service';

@Controller('snapshot-products')
export class SnapshotProductsController {
  constructor(
    private readonly snapshotProductsService: SnapshotProductsService,
  ) {}

  @Post()
  create(
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
    return this.snapshotProductsService.create(body);
  }

  @Get()
  findAll(@Query('snapshotId') snapshotId?: string) {
    return this.snapshotProductsService.findAll(
      snapshotId ? Number(snapshotId) : undefined,
    );
  }
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.snapshotProductsService.remove(Number(id));
  }
}
