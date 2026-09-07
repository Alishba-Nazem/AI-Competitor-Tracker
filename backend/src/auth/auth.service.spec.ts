import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma.service';
import { AuthService, resolveJwtSecret } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get(AuthService);
  });

  it('creates an account and returns a token', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 1,
      name: 'Alish',
      email: 'alish@example.com',
    });

    const result = await service.signup({
      name: 'Alish',
      email: 'alish@example.com',
      password: 'password1',
    });

    expect(result.user.email).toBe('alish@example.com');
    expect(result.token).toBeTruthy();
  });

  it('rejects a duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 1 });
    await expect(
      service.signup({
        name: 'Alish',
        email: 'alish@example.com',
        password: 'password1',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects an invalid password', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 1,
      email: 'alish@example.com',
      passwordHash: await hash('correct-password', 4),
    });

    await expect(
      service.login({ email: 'alish@example.com', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects tokens signed with the public fallback once a real secret is configured', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 1,
      name: 'Alish',
      email: 'alish@example.com',
    });

    const forged = jwt.sign(
      { sub: 1, name: 'Alish', email: 'alish@example.com' },
      'ect-local-dev-secret',
      { expiresIn: '1h' },
    );

    const previous = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'unit-test-production-like-secret';
    try {
      const locked = new AuthService(prisma as unknown as PrismaService);
      expect(() => locked.verifyToken(forged)).toThrow(UnauthorizedException);

      const issued = await locked.signup({
        name: 'Alish',
        email: 'alish@example.com',
        password: 'password1',
      });
      expect(locked.verifyToken(issued.token).id).toBe(1);
    } finally {
      if (previous === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previous;
    }
  });
});

describe('resolveJwtSecret', () => {
  it('refuses to boot in production without JWT_SECRET', () => {
    expect(() =>
      resolveJwtSecret({ NODE_ENV: 'production' } as NodeJS.ProcessEnv),
    ).toThrow(/JWT_SECRET is not set/);
  });

  it('refuses known placeholder secrets in production', () => {
    expect(() =>
      resolveJwtSecret({
        NODE_ENV: 'production',
        JWT_SECRET: 'ect-local-dev-secret',
      } as NodeJS.ProcessEnv),
    ).toThrow(/insecure placeholder/);
    expect(() =>
      resolveJwtSecret({
        NODE_ENV: 'production',
        JWT_SECRET: 'change-me-in-production',
      } as NodeJS.ProcessEnv),
    ).toThrow(/insecure placeholder/);
  });

  it('accepts a unique secret in production', () => {
    expect(
      resolveJwtSecret({
        NODE_ENV: 'production',
        JWT_SECRET: 'a-long-random-production-secret',
      } as NodeJS.ProcessEnv),
    ).toBe('a-long-random-production-secret');
  });

  it('keeps the local fallback in test and development', () => {
    expect(resolveJwtSecret({ NODE_ENV: 'test' } as NodeJS.ProcessEnv)).toBe(
      'ect-local-dev-secret',
    );
    expect(
      resolveJwtSecret({ NODE_ENV: 'development' } as NodeJS.ProcessEnv),
    ).toBe('ect-local-dev-secret');
  });
});
