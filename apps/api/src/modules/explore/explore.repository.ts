import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';
import { AIStatus } from '@corpusai/database';

const AI_PUBLIC_SELECT = {
  id: true,
  slug: true,
  name: true,
  description: true,
  primaryColor: true,
  logo: true,
  category: true,
  conversationCount: true,
  createdAt: true,
  user: { select: { id: true, name: true, username: true, image: true } },
} as const;

@Injectable()
export class ExploreRepository {
  constructor(private readonly db: PrismaService) {}

  async findPublicAIs(where: object, orderBy: object, skip: number, take: number) {
    return Promise.all([
      this.db.client.aI.findMany({ where, orderBy, skip, take, select: AI_PUBLIC_SELECT }),
      this.db.client.aI.count({ where }),
    ]);
  }

  async findFeaturedAIs() {
    return this.db.client.aI.findMany({
      where: { isPublic: true, status: AIStatus.ACTIVE, deletedAt: null },
      orderBy: { conversationCount: 'desc' },
      take: 6,
      select: AI_PUBLIC_SELECT,
    });
  }

  async findCreatorProfile(username: string) {
    return this.db.client.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        image: true,
        createdAt: true,
        ais: {
          where: { isPublic: true, status: AIStatus.ACTIVE, deletedAt: null },
          orderBy: { conversationCount: 'desc' },
          select: AI_PUBLIC_SELECT,
        },
      },
    });
  }
}
