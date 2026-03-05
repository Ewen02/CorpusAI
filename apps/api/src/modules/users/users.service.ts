import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { prisma } from '@corpusai/database';
import {
  getFeatureLimits,
  getRemainingUsage,
  type SubscriptionPlanType,
} from '@corpusai/subscription';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        createdAt: true,
        _count: {
          select: {
            ais: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    return prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        image: data.image,
      },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        updatedAt: true,
      },
    });
  }

  async getDashboardStats(userId: string) {
    // Use Prisma aggregation to avoid N+1 and reduce memory usage
    const [user, stats] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionPlan: true },
      }),
      prisma.aI.aggregate({
        where: { userId },
        _count: true,
        _sum: {
          documentCount: true,
          conversationCount: true,
          questionCount: true,
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      aiCount: stats._count,
      documentCount: stats._sum.documentCount ?? 0,
      conversationCount: stats._sum.conversationCount ?? 0,
      questionCount: stats._sum.questionCount ?? 0,
      subscriptionPlan: user.subscriptionPlan,
    };
  }

  async getAccounts(userId: string) {
    const accounts = await prisma.account.findMany({
      where: { userId },
      select: {
        providerId: true,
        createdAt: true,
      },
    });

    return accounts;
  }

  async getAnalytics(userId: string, period: '7d' | '30d' | '90d' = '30d') {
    const days = period === '7d' ? 7 : period === '90d' ? 90 : 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Query global DailyStats (aiId = null) for the period
    const stats = await prisma.dailyStats.findMany({
      where: {
        userId,
        aiId: null,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
      select: {
        date: true,
        documentCount: true,
        conversationCount: true,
        questionCount: true,
      },
    });

    // Build date -> stats map for gap filling
    const statsMap = new Map<string, (typeof stats)[0]>();
    for (const s of stats) {
      const dateKey = s.date.toISOString().split('T')[0]!;
      statsMap.set(dateKey, s);
    }

    // Generate daily array with gap filling (0 for missing days)
    type DailyDataPoint = {
      date: string;
      documents: number;
      conversations: number;
      questions: number;
    };
    const daily: DailyDataPoint[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0]!;
      const dayStats = statsMap.get(dateKey);

      daily.push({
        date: dateKey,
        documents: dayStats?.documentCount ?? 0,
        conversations: dayStats?.conversationCount ?? 0,
        questions: dayStats?.questionCount ?? 0,
      });
    }

    // Calculate totals (sum over the period)
    const totals = daily.reduce(
      (acc, d) => ({
        documents: acc.documents + d.documents,
        conversations: acc.conversations + d.conversations,
        questions: acc.questions + d.questions,
      }),
      { documents: 0, conversations: 0, questions: 0 }
    );

    // Calculate trends (compare first half vs second half)
    const midpoint = Math.floor(daily.length / 2);
    const firstHalf = daily.slice(0, midpoint);
    const secondHalf = daily.slice(midpoint);

    type MetricKey = 'documents' | 'conversations' | 'questions';

    const sumMetric = (arr: DailyDataPoint[], key: MetricKey): number =>
      arr.reduce((sum: number, d: DailyDataPoint) => sum + d[key], 0);

    const calcTrend = (key: MetricKey) => {
      const first = sumMetric(firstHalf, key) || 1;
      const second = sumMetric(secondHalf, key);
      const change = Math.round(((second - first) / first) * 100);
      return { value: Math.abs(change), isPositive: change >= 0 };
    };

    return {
      daily,
      totals,
      trends: {
        documents: calcTrend('documents'),
        conversations: calcTrend('conversations'),
        questions: calcTrend('questions'),
      },
    };
  }

  async getUsage(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        subscriptionStatus: true,
        subscriptionEnd: true,
        _count: { select: { ais: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const plan = user.subscriptionPlan as SubscriptionPlanType;
    const limits = getFeatureLimits(plan);

    // Count today's questions across all AIs
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const questionsToday = await prisma.message.count({
      where: {
        role: 'USER',
        createdAt: { gte: todayStart },
        conversation: { ai: { userId } },
      },
    });

    return {
      plan,
      status: user.subscriptionStatus,
      expiresAt: user.subscriptionEnd,
      limits: {
        ais: { used: user._count.ais, max: limits.maxAIs },
        questionsPerDay: { used: questionsToday, max: limits.maxQuestionsPerDay },
      },
      remaining: {
        ais: getRemainingUsage(plan, 'ais', user._count.ais),
        questionsPerDay: getRemainingUsage(plan, 'questions', questionsToday),
      },
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    const logger = new Logger('UsersService');

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Cascade delete handles most relations, but log it
    logger.warn(`Deleting account for user ${user.email} (${user.id})`);

    await prisma.user.delete({ where: { id: userId } });

    logger.log(`Account deleted: ${user.email}`);
  }
}
