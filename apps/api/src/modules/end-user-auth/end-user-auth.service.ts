import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { MAIL_SERVICE, type IMailService } from '../../infrastructure/mail';
import { EndUserAuthRepository } from './end-user-auth.repository';

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

    await this.repo.setMagicLink(endUser.id, token, expires);

    let aiName: string | undefined;
    if (aiSlug && username) {
      const ai = await this.repo.findAIBySlugAndUsername(aiSlug, username);
      aiName = ai?.name;
    }

    await this.mail.sendMagicLink(email, token, aiName);
  }

  async verifyMagicLink(token: string): Promise<string> {
    const endUser = await this.repo.findByMagicLinkToken(token);

    if (!endUser || !endUser.magicLinkExpires || endUser.magicLinkExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    const sessionToken = randomBytes(32).toString('hex');
    const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.repo.activateSession(endUser.id, sessionToken, sessionExpires);

    return sessionToken;
  }

  async signOut(sessionToken: string): Promise<void> {
    await this.repo.clearSession(sessionToken);
  }
}
