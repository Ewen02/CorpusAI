import { Injectable, NotFoundException } from "@nestjs/common";
import { prisma } from "@corpusai/database";
import { UpdateProfileDto } from "./dto/update-profile.dto";

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
      throw new NotFoundException("User not found");
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
      throw new NotFoundException("User not found");
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

    // Get current totals
    const currentStats = await this.getDashboardStats(userId);

    // Generate data based on current totals (synthetic until we have real history)
    const daily = this.generateDailyData(currentStats, days);

    // Calculate trends (compare first half to second half)
    const midpoint = Math.floor(daily.length / 2);
    const firstHalf = daily.slice(0, midpoint);
    const secondHalf = daily.slice(midpoint);

    type DailyDataPoint = { date: string; documents: number; conversations: number; questions: number };
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
      totals: {
        documents: currentStats.documentCount,
        conversations: currentStats.conversationCount,
        questions: currentStats.questionCount,
      },
      trends: {
        documents: calcTrend('documents'),
        conversations: calcTrend('conversations'),
        questions: calcTrend('questions'),
      },
    };
  }

  private generateDailyData(
    currentStats: { documentCount: number; conversationCount: number; questionCount: number },
    days: number
  ) {
    const data: { date: string; documents: number; conversations: number; questions: number }[] = [];
    const today = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Progressive growth towards current values with some variance
      const progress = (days - i) / days;
      const variance = 0.8 + Math.random() * 0.4;

      data.push({
        date: date.toISOString().split('T')[0] as string,
        documents: Math.round(currentStats.documentCount * progress * variance),
        conversations: Math.round(currentStats.conversationCount * progress * variance),
        questions: Math.round(currentStats.questionCount * progress * variance),
      });
    }

    return data;
  }
}
