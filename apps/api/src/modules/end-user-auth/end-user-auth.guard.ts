import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { Sentry } from '../../lib/sentry';
import { EndUserAuthRepository } from './end-user-auth.repository';
import { hashToken } from './end-user-auth.service';

@Injectable()
export class EndUserAuthGuard implements CanActivate {
  constructor(private readonly repository: EndUserAuthRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionToken = request.cookies?.['eu_session'] as string | undefined;

    if (!sessionToken) {
      throw new UnauthorizedException('End-user session required');
    }

    const endUser = await this.repository.findBySessionToken(hashToken(sessionToken));

    if (!endUser || !endUser.sessionExpires || endUser.sessionExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    (request as Request & { endUser: typeof endUser }).endUser = endUser;

    Sentry.setUser({ id: endUser.id, email: endUser.email });
    Sentry.setTag('userType', 'end-user');

    return true;
  }
}
