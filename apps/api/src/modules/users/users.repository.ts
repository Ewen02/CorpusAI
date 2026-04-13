import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';

@Injectable()
export class UsersRepository {
  constructor(private readonly db: PrismaService) {}

  async findProfile(userId: string) {
    return this.db.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        username: true,
        bio: true,
        notificationPreferences: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        createdAt: true,
        _count: { select: { ais: true } },
      },
    });
  }

  async findByUsername(username: string) {
    return this.db.client.user.findUnique({
      where: { username },
      select: { id: true },
    });
  }

  async updateUsername(userId: string, username: string) {
    return this.db.client.user.update({
      where: { id: userId },
      data: { username },
      select: { username: true },
    });
  }

  async updateProfile(userId: string, data: Record<string, unknown>) {
    return this.db.client.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        username: true,
        bio: true,
        notificationPreferences: true,
        updatedAt: true,
      },
    });
  }

  async getDashboardAggregates(userId: string) {
    return Promise.all([
      this.db.client.user.findUnique({
        where: { id: userId },
        select: { subscriptionPlan: true },
      }),
      this.db.client.aI.aggregate({
        where: { userId },
        _count: true,
        _sum: {
          documentCount: true,
          conversationCount: true,
          questionCount: true,
        },
      }),
    ]);
  }

  async findAccounts(userId: string) {
    return this.db.client.account.findMany({
      where: { userId },
      select: { providerId: true, createdAt: true },
    });
  }

  async findDailyStats(userId: string, startDate: Date) {
    return this.db.client.dailyStats.findMany({
      where: { userId, aiId: null, date: { gte: startDate } },
      orderBy: { date: 'asc' },
      select: { date: true, documentCount: true, conversationCount: true, questionCount: true },
    });
  }

  async findUsage(userId: string) {
    return this.db.client.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionEnd: true,
        _count: { select: { ais: true } },
      },
    });
  }

  async countTodayQuestions(userId: string, todayStart: Date) {
    return this.db.client.message.count({
      where: {
        role: 'USER',
        createdAt: { gte: todayStart },
        conversation: { ai: { userId } },
      },
    });
  }

  async findForDelete(userId: string) {
    return this.db.client.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
  }

  async deleteUser(userId: string) {
    return this.db.client.user.delete({ where: { id: userId } });
  }
}
