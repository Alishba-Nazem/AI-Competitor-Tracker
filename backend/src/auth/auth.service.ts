import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { compare, hash } from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';

const TOKEN_TTL = '7d';
const DEV_FALLBACK_SECRET = 'ect-local-dev-secret';
const INSECURE_JWT_SECRETS = new Set([
  DEV_FALLBACK_SECRET,
  'change-me-in-production',
]);

export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

/**
 * JWT signing key. The previous public fallback is only allowed in
 * development/test so a production deploy cannot mint or accept tokens
 * anyone can forge from this source tree.
 */
export function resolveJwtSecret(
  env: NodeJS.ProcessEnv = process.env,
): string {
  const secret = env.JWT_SECRET?.trim() ?? '';
  const nodeEnv = env.NODE_ENV?.trim() ?? '';
  const allowInsecure =
    nodeEnv === 'development' ||
    nodeEnv === 'test' ||
    env.ALLOW_INSECURE_JWT === '1';

  if (!secret) {
    if (!allowInsecure) {
      throw new Error(
        'JWT_SECRET is not set. Refusing to sign or verify sessions with a public fallback secret.',
      );
    }
    return DEV_FALLBACK_SECRET;
  }

  if (INSECURE_JWT_SECRETS.has(secret) && !allowInsecure) {
    throw new Error(
      'JWT_SECRET is a known insecure placeholder. Set a long random value before signing sessions.',
    );
  }

  return secret;
}

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;

  constructor(private readonly prisma: PrismaService) {
    this.jwtSecret = resolveJwtSecret();
  }

  async signup(dto: SignupDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists.');
    }

    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        email,
        passwordHash: await hash(dto.password, 10),
      },
    });

    return this.toAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password.');
    }

    return this.toAuthResponse(user);
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
    return user;
  }

  verifyToken(token: string): AuthUser {
    try {
      const payload = jwt.verify(token, this.jwtSecret) as {
        sub?: number;
        name?: string;
        email?: string;
      };
      if (!payload.sub || !payload.email || !payload.name) {
        throw new UnauthorizedException();
      }
      return { id: payload.sub, name: payload.name, email: payload.email };
    } catch {
      throw new UnauthorizedException('Session expired. Please sign in again.');
    }
  }

  private toAuthResponse(user: { id: number; name: string; email: string }) {
    const token = jwt.sign(
      { sub: user.id, name: user.name, email: user.email },
      this.jwtSecret,
      { expiresIn: TOKEN_TTL },
    );

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

}
