import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Get('status')
  getStatus(@CurrentUser() user: AuthUser) {
    return this.onboardingService.getStatus(user.id);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthUser) {
    return this.onboardingService.getProfile(user.id);
  }

  @Post('complete')
  complete(
    @CurrentUser() user: AuthUser,
    @Body() dto: CompleteOnboardingDto,
  ) {
    return this.onboardingService.complete(user.id, dto);
  }

  @Post('reset')
  reset(@CurrentUser() user: AuthUser) {
    return this.onboardingService.reset(user.id);
  }
}
