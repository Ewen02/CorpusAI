import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';

@Injectable()
export class EndUserAuthRepository {
  constructor(private readonly db: PrismaService) {}

  async upsertEndUser(email: string) {
    return this.db.client.endUser.upsert({
      where: { email },
      create: { email },
      update: {},
    });
  }

  async setMagicLink(endUserId: string, token: string, expires: Date) {
    return this.db.client.endUser.update({
      where: { id: endUserId },
      data: { magicLinkToken: token, magicLinkExpires: expires },
    });
  }

  async findAIBySlugAndUsername(slug: string, username: string) {
    return this.db.client.aI.findFirst({
      where: { slug, user: { username }, deletedAt: null },
      select: { name: true },
    });
  }

  async findByMagicLinkToken(token: string) {
    return this.db.client.endUser.findUnique({ where: { magicLinkToken: token } });
  }

  async activateSession(endUserId: string, sessionToken: string, sessionExpires: Date) {
    return this.db.client.endUser.update({
      where: { id: endUserId },
      data: {
        magicLinkToken: null,
        magicLinkExpires: null,
        sessionToken,
        sessionExpires,
        emailVerified: true,
      },
    });
  }

  async clearSession(sessionToken: string) {
    return this.db.client.endUser.updateMany({
      where: { sessionToken },
      data: { sessionToken: null, sessionExpires: null },
    });
  }
}
