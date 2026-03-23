import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, AIStatus } from '@corpusai/database';
import { ExploreQueryDto, ExploreSort } from './dto/explore-query.dto';

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
  user: {
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
    },
  },
} as const;

@Injectable()
export class ExploreService {
  async findPublicAIs(query: ExploreQueryDto) {
    const { search, category, sort = ExploreSort.POPULAR, page = 1, limit = 24 } = query;

    const where = {
      isPublic: true,
      status: AIStatus.ACTIVE,
      deletedAt: null,
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { description: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [ais, total] = await Promise.all([
      prisma.aI.findMany({
        where,
        orderBy:
          sort === ExploreSort.POPULAR ? { conversationCount: 'desc' } : { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: AI_PUBLIC_SELECT,
      }),
      prisma.aI.count({ where }),
    ]);

    return {
      data: ais,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findFeaturedAIs() {
    const ais = await prisma.aI.findMany({
      where: {
        isPublic: true,
        status: AIStatus.ACTIVE,
        deletedAt: null,
      },
      orderBy: { conversationCount: 'desc' },
      take: 6,
      select: AI_PUBLIC_SELECT,
    });

    return ais;
  }

  async findCreatorProfile(username: string) {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        bio: true,
        image: true,
        createdAt: true,
        ais: {
          where: {
            isPublic: true,
            status: AIStatus.ACTIVE,
            deletedAt: null,
          },
          orderBy: { conversationCount: 'desc' },
          select: AI_PUBLIC_SELECT,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Creator not found');
    }

    return user;
  }
}
