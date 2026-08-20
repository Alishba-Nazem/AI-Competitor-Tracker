import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  ParseIntPipe,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreateCompetitorDto } from './dto/create-competitor.dto';
import { UpdateCompetitorDto } from './dto/update-competitor.dto';
import { CompetitorsService } from './competitors.service';

@Controller('competitors')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class CompetitorsController {
  constructor(private readonly competitorsService: CompetitorsService) {}

  @Post()
  create(@Body() createCompetitorDto: CreateCompetitorDto) {
    return this.competitorsService.create(createCompetitorDto);
  }

  @Get()
  findAll() {
    return this.competitorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.competitorsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCompetitorDto: UpdateCompetitorDto,
  ) {
    return this.competitorsService.update(id, updateCompetitorDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.competitorsService.remove(id);
  }
}
