import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { ScraperModule } from '../scraper/scraper.module';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

@Module({
  imports: [PrismaModule, ScraperModule],
  controllers: [OnboardingController],
  providers: [OnboardingService],
})
export class OnboardingModule {}
