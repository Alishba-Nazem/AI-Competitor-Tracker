import { Body, Controller, Get, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  getStatus() {
    return this.onboardingService.getStatus();
  }

  @Get('profile')
  getProfile() {
    return this.onboardingService.getProfile();
  }

  @Post('complete')
  complete(@Body() dto: CompleteOnboardingDto) {
    return this.onboardingService.complete(dto);
  }

  @Post('reset')
  reset() {
    return this.onboardingService.reset();
  }
}
