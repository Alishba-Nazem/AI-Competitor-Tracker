import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { PrismaService } from '../prisma.service';
import { AuthService } from './auth.service';

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
});
