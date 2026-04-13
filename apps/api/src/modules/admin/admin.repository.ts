import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';
import type { UserRole, SubscriptionPlan, SubscriptionStatus } from '@corpusai/database';

@Injectable()
export class AdminRepository {
  constructor(private readonly db: PrismaService) {}

  async getCounts() {
    return Promise.all([
      this.db.client.user.count(),
      this.db.client.aI.count(),
      this.db.client.document.count(),
      this.db.client.conversation.count(),
      this.db.client.message.count(),
    ]);
  }

  async getUsersByPlan() {
    return this.db.client.user.groupBy({ by: ['subscriptionPlan'], _count: true });
  }

  async getDocumentsByStatus() {
    return this.db.client.document.groupBy({ by: ['status'], _count: true });
  }

  async countRecentSignups(since: Date) {
    return this.db.client.user.count({ where: { createdAt: { gte: since } } });
  }

  async getTopAIs(take: number) {
    return this.db.client.aI.findMany({
      orderBy: { conversationCount: 'desc' },
      take,
      select: {
        id: true,
        name: true,
        slug: true,
        conversationCount: true,
        questionCount: true,
        documentCount: true,
        user: { select: { email: true, name: true } },
      },
    });
  }

  async countFailedDocs() {
    return this.db.client.document.count({ where: { status: 'FAILED' } });
  }

  async getUsers(skip: number, take: number, where: object) {
    return Promise.all([
      this.db.client.user.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          username: true,
          role: true,
          subscriptionPlan: true,
          subscriptionStatus: true,
          createdAt: true,
          _count: { select: { ais: true, dailyStats: true } },
          sessions: {
            orderBy: { updatedAt: 'desc' as const },
            take: 1,
            select: { updatedAt: true },
          },
        },
      }),
      this.db.client.user.count({ where }),
    ]);
  }

  async getAIs(skip: number, take: number, where: object) {
    return Promise.all([
      this.db.client.aI.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          isPublic: true,
          accessType: true,
          documentCount: true,
          conversationCount: true,
          questionCount: true,
          createdAt: true,
          updatedAt: true,
          user: { select: { id: true, email: true, name: true } },
        },
      }),
      this.db.client.aI.count({ where }),
    ]);
  }

  async updateUserRole(userId: string, role: UserRole) {
    return this.db.client.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, role: true },
    });
  }

  async updateUserPlan(userId: string, plan: SubscriptionPlan, status?: SubscriptionStatus) {
    return this.db.client.user.update({
      where: { id: userId },
      data: { subscriptionPlan: plan, subscriptionStatus: status },
      select: { id: true, email: true, subscriptionPlan: true, subscriptionStatus: true },
    });
  }

  async pingPostgres() {
    return this.db.client.$queryRaw`SELECT 1`;
  }

  async getDocumentQueueCounts() {
    return Promise.all([
      this.db.client.document.count({ where: { status: 'FAILED' } }),
      this.db.client.document.count({ where: { status: 'PENDING' } }),
      this.db.client.document.count({ where: { status: 'PROCESSING' } }),
    ]);
  }
}
