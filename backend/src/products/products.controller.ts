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
} from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  create(
    @Body()
    body: {
      competitorId: number;
      name: string;
      url: string;
      currentPrice: number;
      currency: string;
    },
  ) {
    return this.productsService.create({
      competitorId: Number(body.competitorId),
      name: body.name,
      url: body.url,
      currentPrice: Number(body.currentPrice),
      currency: body.currency,
    });
  }

  @Get()
  findAll(@Query('competitorId') competitorId?: string) {
    return this.productsService.findAll(
      competitorId ? Number(competitorId) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      name?: string;
      url?: string;
      currentPrice?: number;
      currency?: string;
    },
  ) {
    return this.productsService.update(id, {
      ...body,
      currentPrice:
        body.currentPrice !== undefined ? Number(body.currentPrice) : undefined,
    });
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
