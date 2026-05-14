import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { auth, type Session, type User } from '../../lib/auth';
import { fromNodeHeaders } from 'better-auth/node';
import { Sentry } from '../../lib/sentry';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  session: Session['session'];
  user: User;
}

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly blockedStatuses: Set<string>;

  constructor(config: ConfigService) {
    const raw = config.get<string>('BILLING_BLOCKED_STATUSES') ?? 'CANCELED,PAST_DUE';
    this.blockedStatuses = new Set(
      raw
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean)
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }

    const status = (session.user as Record<string, unknown>).subscriptionStatus as
      | string
      | undefined;
    if (status && this.blockedStatuses.has(status.toUpperCase())) {
      throw new ForbiddenException(
        'Your subscription is inactive. Please update your billing to continue.'
      );
    }

    request.session = session.session;
    request.user = session.user;

    Sentry.setUser({ id: session.user.id, email: session.user.email });
    Sentry.setTag('userType', 'creator');

    return true;
  }
}
