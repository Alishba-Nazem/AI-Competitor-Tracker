import { Module } from '@nestjs/common';
import { CompetitorsController } from './competitors.controller';
import { CompetitorsService } from './competitors.service';
import { PrismaModule } from '../prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [CompetitorsController],
  providers: [CompetitorsService],
})
export class CompetitorsModule {}
