import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { auth, type Session, type User } from '../../lib/auth';
import type { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  session: Session['session'];
  user: User;
}

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

    // Attach session and user to request for later use
    request.session = session.session;
    request.user = session.user;

    return true;
  }
}
