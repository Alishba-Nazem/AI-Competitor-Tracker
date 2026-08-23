import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth/auth.service';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';

const user = { id: 7, name: 'Alish', email: 'alish@example.com' };

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
      providers: [
        { provide: OnboardingService, useValue: onboardingService },
        { provide: AuthService, useValue: {} },
      ],
    }).compile();

    controller = module.get<OnboardingController>(OnboardingController);
  });

  it('returns onboarding status', async () => {
    const response = { completed: false, profile: null };
    onboardingService.getStatus.mockResolvedValue(response);

    await expect(controller.getStatus(user)).resolves.toBe(response);
    expect(onboardingService.getStatus).toHaveBeenCalledWith(7);
  });

  it('completes onboarding', async () => {
    const response = { profile: { id: 1 }, competitors: [] };
    onboardingService.complete.mockResolvedValue(response);

    await expect(
      controller.complete(user, {
        businessName: 'Acme',
        category: 'Fashion',
        country: 'Pakistan',
        competitors: [{ url: 'https://www.daraz.pk/shop/bonanza-satrangi' }],
      }),
    ).resolves.toBe(response);
    expect(onboardingService.complete).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ businessName: 'Acme' }),
    );
  });

  it('resets onboarding for this account', async () => {
    const response = { reset: true, completed: false };
    onboardingService.reset.mockResolvedValue(response);
    await expect(controller.reset(user)).resolves.toBe(response);
    expect(onboardingService.reset).toHaveBeenCalledWith(7);
  });
});
