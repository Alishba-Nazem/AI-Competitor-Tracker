import { Module } from '@nestjs/common';
import { ChangesModule } from '../changes/changes.module';
import { PrismaModule } from '../prisma.module';
import { ClaudeClient } from './claude.client';
import { IntelligenceController } from './intelligence.controller';
import { IntelligenceService } from './intelligence.service';

@Module({
  imports: [PrismaModule, ChangesModule],
  controllers: [IntelligenceController],
  providers: [IntelligenceService, ClaudeClient],
})
export class IntelligenceModule {}
