import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@corpusai/database';
import { Sentry } from '../../lib/sentry';
import type { Request } from 'express';

@Injectable()
export class EndUserAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const sessionToken = request.cookies?.['eu_session'] as string | undefined;

    if (!sessionToken) {
      throw new UnauthorizedException('End-user session required');
    }

    const endUser = await prisma.endUser.findUnique({
      where: { sessionToken },
    });

    if (!endUser || !endUser.sessionExpires || endUser.sessionExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    // Inject end-user into request
    (request as Request & { endUser: typeof endUser }).endUser = endUser;

    // Enrich Sentry with end-user context
    Sentry.setUser({ id: endUser.id, email: endUser.email });
    Sentry.setTag('userType', 'end-user');

    return true;
  }
}
