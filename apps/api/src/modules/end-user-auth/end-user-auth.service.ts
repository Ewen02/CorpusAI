import { Injectable, UnauthorizedException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { prisma } from '@corpusai/database';
import { MailService } from '../mail/mail.service';

@Injectable()
export class EndUserAuthService {
  constructor(private readonly mail: MailService) {}

  async sendMagicLink(email: string, aiSlug?: string, username?: string): Promise<void> {
    // Upsert EndUser by email
    const endUser = await prisma.endUser.upsert({
      where: { email },
      create: { email },
      update: {},
    });

    const token = randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.endUser.update({
      where: { id: endUser.id },
      data: { magicLinkToken: token, magicLinkExpires: expires },
    });

    // Fetch AI name if slug and username provided
    let aiName: string | undefined;
    if (aiSlug && username) {
      const ai = await prisma.aI.findFirst({
        where: { slug: aiSlug, user: { username }, deletedAt: null },
        select: { name: true },
      });
      aiName = ai?.name;
    }

    await this.mail.sendMagicLink(email, token, aiName);
  }

  async verifyMagicLink(token: string): Promise<string> {
    const endUser = await prisma.endUser.findUnique({
      where: { magicLinkToken: token },
    });

    if (!endUser || !endUser.magicLinkExpires || endUser.magicLinkExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    const sessionToken = randomBytes(32).toString('hex');
    const sessionExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await prisma.endUser.update({
      where: { id: endUser.id },
      data: {
        magicLinkToken: null,
        magicLinkExpires: null,
        sessionToken,
        sessionExpires,
        emailVerified: true,
      },
    });

    return sessionToken;
  }

  async signOut(sessionToken: string): Promise<void> {
    await prisma.endUser.updateMany({
      where: { sessionToken },
      data: { sessionToken: null, sessionExpires: null },
    });
  }
}
