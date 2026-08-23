import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProductsService } from './products.service';

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      competitorId: number;
      name: string;
      url: string;
      currentPrice: number;
      currency: string;
    },
  ) {
    return this.productsService.create(user.id, {
      competitorId: Number(body.competitorId),
      name: body.name,
      url: body.url,
      currentPrice: Number(body.currentPrice),
      currency: body.currency,
    });
  }

  @Get()
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('competitorId') competitorId?: string,
  ) {
    return this.productsService.findAll(
      user.id,
      competitorId ? Number(competitorId) : undefined,
    );
  }

  @Get(':id')
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.findOne(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      url?: string;
      currentPrice?: number;
      currency?: string;
    },
  ) {
    return this.productsService.update(user.id, id, {
      ...body,
      currentPrice:
        body.currentPrice !== undefined ? Number(body.currentPrice) : undefined,
    });
  }

  @Delete(':id')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.productsService.remove(user.id, id);
  }
}
