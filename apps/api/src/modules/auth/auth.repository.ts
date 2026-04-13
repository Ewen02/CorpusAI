import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';

@Injectable()
export class AuthRepository {
  constructor(private readonly db: PrismaService) {}

  async findUserById(userId: string) {
    return this.db.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        createdAt: true,
      },
    });
  }

  async findUserWithAIs(userId: string) {
    return this.db.client.user.findUnique({
      where: { id: userId },
      include: {
        ais: {
          select: {
            id: true,
            slug: true,
            name: true,
            status: true,
            documentCount: true,
            conversationCount: true,
          },
        },
      },
    });
  }
}
