import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

describe('OnboardingController', () => {
  let controller: OnboardingController;

  const onboardingService = {
    getStatus: jest.fn(),
    getProfile: jest.fn(),
    complete: jest.fn(),
    reset: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OnboardingController],
      providers: [{ provide: OnboardingService, useValue: onboardingService }],
    }).compile();

    controller = module.get<OnboardingController>(OnboardingController);
  });

  it('returns onboarding status', async () => {
    const response = { completed: false, profile: null };
    onboardingService.getStatus.mockResolvedValue(response);

    await expect(controller.getStatus()).resolves.toBe(response);
  });

  it('completes onboarding', async () => {
    const response = { profile: { id: 1 }, competitors: [] };
    onboardingService.complete.mockResolvedValue(response);

    await expect(
      controller.complete({
        businessName: 'Acme',
        category: 'Fashion',
        country: 'Pakistan',
        competitors: [{ url: 'https://www.daraz.pk/shop/bonanza-satrangi' }],
      }),
    ).resolves.toBe(response);
  });

  it('resets onboarding for demo', async () => {
    const response = { reset: true, completed: false };
    onboardingService.reset.mockResolvedValue(response);
    await expect(controller.reset()).resolves.toBe(response);
  });
});
