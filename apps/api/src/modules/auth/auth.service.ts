import { Injectable, UnauthorizedException } from '@nestjs/common';
import { auth } from '../../lib/auth';
import { fromNodeHeaders } from 'better-auth/node';
import { AuthRepository } from './auth.repository';
import type { Request } from 'express';

@Injectable()
export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  async validateSession(request: Request) {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!session) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return session;
  }

  async getSessionFromHeaders(headers: Headers) {
    return auth.api.getSession({ headers });
  }

  async getUserById(userId: string) {
    return this.repo.findUserById(userId);
  }

  async getUserWithAIs(userId: string) {
    return this.repo.findUserWithAIs(userId);
  }
}
