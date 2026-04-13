import { Injectable, NotFoundException } from '@nestjs/common';
import { AIStatus } from '@corpusai/database';
import { ExploreQueryDto, ExploreSort } from './dto/explore-query.dto';
import { ExploreRepository } from './explore.repository';

@Injectable()
export class ExploreService {
  constructor(private readonly repo: ExploreRepository) {}

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

    const orderBy =
      sort === ExploreSort.POPULAR
        ? { conversationCount: 'desc' as const }
        : { createdAt: 'desc' as const };

    const [ais, total] = await this.repo.findPublicAIs(where, orderBy, (page - 1) * limit, limit);

    return {
      data: ais,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findFeaturedAIs() {
    return this.repo.findFeaturedAIs();
  }

  async findCreatorProfile(username: string) {
    const user = await this.repo.findCreatorProfile(username);

    if (!user) {
      throw new NotFoundException('Creator not found');
    }

    return user;
  }
}
