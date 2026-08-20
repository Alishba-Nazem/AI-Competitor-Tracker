import { Module } from '@nestjs/common';
import { ChangesModule } from '../changes/changes.module';
import { PrismaModule } from '../prisma.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [PrismaModule, ChangesModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
