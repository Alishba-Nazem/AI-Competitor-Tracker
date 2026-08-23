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

export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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
      const payload = jwt.verify(token, this.secret()) as {
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
      this.secret(),
      { expiresIn: TOKEN_TTL },
    );

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email },
    };
  }

  private secret() {
    return process.env.JWT_SECRET || 'ect-local-dev-secret';
  }
}
