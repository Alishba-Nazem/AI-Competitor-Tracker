import { UnauthorizedException } from '@nestjs/common';
import { SchedulerSecretGuard } from './scheduler-secret.guard';

function executionContext(headers: Record<string, string | string[] | undefined>) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as never;
}

describe('SchedulerSecretGuard', () => {
  const original = process.env.SCHEDULER_SECRET;
  const guard = new SchedulerSecretGuard();

  afterEach(() => {
    if (original === undefined) {
      delete process.env.SCHEDULER_SECRET;
    } else {
      process.env.SCHEDULER_SECRET = original;
    }
  });

  it('rejects unauthenticated requests when SCHEDULER_SECRET is unset', () => {
    delete process.env.SCHEDULER_SECRET;
    expect(() => guard.canActivate(executionContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects requests without a secret even when SCHEDULER_SECRET is configured', () => {
    process.env.SCHEDULER_SECRET = 'operator-secret';
    expect(() => guard.canActivate(executionContext({}))).toThrow(
      UnauthorizedException,
    );
  });

  it('rejects a login JWT or other bearer token that is not the scheduler secret', () => {
    process.env.SCHEDULER_SECRET = 'operator-secret';
    expect(() =>
      guard.canActivate(
        executionContext({ authorization: 'Bearer user-session-jwt' }),
      ),
    ).toThrow(UnauthorizedException);
  });

  it('accepts the matching x-scheduler-secret header', () => {
    process.env.SCHEDULER_SECRET = 'operator-secret';
    expect(
      guard.canActivate(
        executionContext({ 'x-scheduler-secret': 'operator-secret' }),
      ),
    ).toBe(true);
  });

  it('accepts the matching secret as a bearer token', () => {
    process.env.SCHEDULER_SECRET = 'operator-secret';
    expect(
      guard.canActivate(
        executionContext({ authorization: 'Bearer operator-secret' }),
      ),
    ).toBe(true);
  });
});
