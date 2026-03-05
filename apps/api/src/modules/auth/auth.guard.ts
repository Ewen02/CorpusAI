import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { auth, type Session, type User } from '../../lib/auth';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  session: Session['session'];
  user: User;
}

const BLOCKED_STATUSES = new Set(['CANCELED', 'PAST_DUE']);

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const session = await auth.api.getSession({
      headers: request.headers as unknown as Headers,
    });

    if (!session) {
      throw new UnauthorizedException('Authentication required');
    }

    // Check subscription status — block access if canceled or past due
    const status = (session.user as Record<string, unknown>).subscriptionStatus as
      | string
      | undefined;
    if (status && BLOCKED_STATUSES.has(status)) {
      throw new ForbiddenException(
        'Your subscription is inactive. Please update your billing to continue.'
      );
    }

    // Attach session and user to request for later use
    request.session = session.session;
    request.user = session.user;

    return true;
  }
}
