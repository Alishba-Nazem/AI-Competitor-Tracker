import { Module } from '@nestjs/common';
import { ChangesModule } from '../changes/changes.module';
import { PrismaModule } from '../prisma.module';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';

@Module({
  imports: [PrismaModule, ChangesModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService],
})
export class IntelligenceModule {}
