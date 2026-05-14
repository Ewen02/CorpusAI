import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import { MAIL_SERVICE, type IMailService } from '../../infrastructure/mail';
import { EndUserAuthRepository } from './end-user-auth.repository';

/**
 * Magic-link tokens and session tokens are sent to the client in plaintext but
 * stored hashed (SHA-256). A DB leak therefore can't be replayed against the
 * live session — an attacker would still need the original token from the cookie.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class EndUserAuthService {
  constructor(
    @Inject(MAIL_SERVICE) private readonly mail: IMailService,
    private readonly repo: EndUserAuthRepository
  ) {}

  async sendMagicLink(email: string, aiSlug?: string, username?: string): Promise<void> {
    const endUser = await this.repo.upsertEndUser(email);

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await this.repo.setMagicLink(endUser.id, hashToken(token), expires);

    let aiName: string | undefined;
    if (aiSlug && username) {
      const ai = await this.repo.findAIBySlugAndUsername(aiSlug, username);
      aiName = ai?.name;
    }

    await this.mail.sendMagicLink(email, token, aiName);
  }

  async verifyMagicLink(token: string): Promise<string> {
    const endUser = await this.repo.findByMagicLinkToken(hashToken(token));

    if (!endUser || !endUser.magicLinkExpires || endUser.magicLinkExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    const sessionToken = randomBytes(32).toString('hex');
    const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.repo.activateSession(endUser.id, hashToken(sessionToken), sessionExpires);

    return sessionToken;
  }

  async signOut(sessionToken: string): Promise<void> {
    await this.repo.clearSession(hashToken(sessionToken));
  }
}
