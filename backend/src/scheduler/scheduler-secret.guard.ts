import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';

export function schedulerSecretsEqual(
  provided: string,
  expected: string,
): boolean {
  const left = Buffer.from(provided, 'utf8');
  const right = Buffer.from(expected, 'utf8');
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function readSchedulerSecret(
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const header = headers['x-scheduler-secret'];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  if (typeof fromHeader === 'string' && fromHeader.trim()) {
    return fromHeader.trim();
  }

  const authorization = headers.authorization;
  const bearer = Array.isArray(authorization)
    ? authorization[0]
    : authorization;
  if (typeof bearer === 'string' && bearer.startsWith('Bearer ')) {
    const token = bearer.slice(7).trim();
    return token || null;
  }
  return null;
}

@Injectable()
export class SchedulerSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const expected = process.env.SCHEDULER_SECRET?.trim();
    if (!expected) {
      throw new UnauthorizedException('Scheduler trigger is disabled.');
    }

    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    const provided = readSchedulerSecret(request.headers);
    if (!provided || !schedulerSecretsEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid scheduler secret.');
    }
    return true;
  }
}
