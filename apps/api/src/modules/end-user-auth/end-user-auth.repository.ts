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
      select: { id: true, email: true },
    });
  }

  async setMagicLink(endUserId: string, token: string, expires: Date) {
    return this.db.client.endUser.update({
      where: { id: endUserId },
      data: { magicLinkToken: token, magicLinkExpires: expires },
      select: { id: true },
    });
  }

  async findAIBySlugAndUsername(slug: string, username: string) {
    return this.db.client.aI.findFirst({
      where: { slug, user: { username }, deletedAt: null },
      select: { name: true },
    });
  }

  /**
   * INTERNAL ONLY — used to consume a magic link. Returns only fields required
   * for validation. Excludes sessionToken and sessionExpires (about to be
   * overwritten) and the magicLinkToken itself (already in caller's input).
   */
  async findByMagicLinkToken(token: string) {
    return this.db.client.endUser.findUnique({
      where: { magicLinkToken: token },
      select: { id: true, email: true, magicLinkExpires: true },
    });
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
      select: { id: true, emailVerified: true, sessionExpires: true },
    });
  }

  async clearSession(sessionToken: string) {
    return this.db.client.endUser.updateMany({
      where: { sessionToken },
      data: { sessionToken: null, sessionExpires: null },
    });
  }

  /**
   * INTERNAL ONLY — used by guard for session validation. Caller must never
   * return this record raw (sessionExpires is the only sensitive-adjacent field).
   */
  async findBySessionToken(sessionToken: string) {
    return this.db.client.endUser.findUnique({
      where: { sessionToken },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerified: true,
        sessionExpires: true,
      },
    });
  }
}
