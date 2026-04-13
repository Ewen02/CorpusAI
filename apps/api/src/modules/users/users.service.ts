import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import {
  getFeatureLimits,
  getRemainingUsage,
  type SubscriptionPlanType,
} from '@corpusai/subscription';
import { UpdateProfileDto } from './dto/update-profile.dto';
import {
  getStartDateForPeriod,
  getDaysForPeriod,
  type AnalyticsPeriod,
} from '../../shared/date-utils';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly repo: UsersRepository) {}

  async getProfile(userId: string) {
    const user = await this.repo.findProfile(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.username) {
      const generated = await this.generateUniqueUsername(user.email);
      const updated = await this.repo.updateUsername(userId, generated);
      user.username = updated.username;
    }

    return user;
  }

  private async generateUniqueUsername(email: string): Promise<string> {
    const seed =
      (email.split('@')[0] || 'user')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 24) || 'user';

    for (let i = 0; i < 10; i++) {
      const candidate = i === 0 ? seed : `${seed}-${Math.floor(1000 + Math.random() * 9000)}`;
      const existing = await this.repo.findByUsername(candidate);
      if (!existing) return candidate;
    }
    return `${seed}-${Date.now().toString(36)}`;
  }

  async updateProfile(userId: string, data: UpdateProfileDto) {
    if (data.username) {
      const existing = await this.repo.findByUsername(data.username);
      if (existing && existing.id !== userId) {
        throw new ConflictException('This username is already taken');
      }
    }

    return this.repo.updateProfile(userId, {
      name: data.name,
      image: data.image,
      username: data.username,
      bio: data.bio,
      ...(data.notificationPreferences !== undefined
        ? { notificationPreferences: data.notificationPreferences }
        : {}),
    });
  }

  async getDashboardStats(userId: string) {
    const [user, stats] = await this.repo.getDashboardAggregates(userId);

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
    return this.repo.findAccounts(userId);
  }

  async getAnalytics(userId: string, period: AnalyticsPeriod = '30d') {
    const days = getDaysForPeriod(period);
    const startDate = getStartDateForPeriod(period);

    const stats = await this.repo.findDailyStats(userId, startDate);

    const statsMap = new Map<string, (typeof stats)[0]>();
    for (const s of stats) {
      const dateKey = s.date.toISOString().split('T')[0]!;
      statsMap.set(dateKey, s);
    }

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

    const totals = daily.reduce(
      (acc, d) => ({
        documents: acc.documents + d.documents,
        conversations: acc.conversations + d.conversations,
        questions: acc.questions + d.questions,
      }),
      { documents: 0, conversations: 0, questions: 0 }
    );

    const midpoint = Math.floor(daily.length / 2);
    const firstHalf = daily.slice(0, midpoint);
    const secondHalf = daily.slice(midpoint);

    type MetricKey = 'documents' | 'conversations' | 'questions';

    const sumMetric = (arr: DailyDataPoint[], key: MetricKey): number =>
      arr.reduce((sum: number, d: DailyDataPoint) => sum + d[key], 0);

    const calcTrend = (key: MetricKey) => {
      const first = sumMetric(firstHalf, key);
      const second = sumMetric(secondHalf, key);
      if (first === 0) {
        return { value: second > 0 ? 100 : 0, isPositive: true };
      }
      const change = Math.round(((second - first) / first) * 100);
      const capped = Math.min(Math.abs(change), 999);
      return { value: capped, isPositive: change >= 0 };
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
    const user = await this.repo.findUsage(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const plan = user.subscriptionPlan as SubscriptionPlanType;
    const limits = getFeatureLimits(plan);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const questionsToday = await this.repo.countTodayQuestions(userId, todayStart);

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
    const user = await this.repo.findForDelete(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    this.logger.warn(`Deleting account for user ${user.email} (${user.id})`);
    await this.repo.deleteUser(userId);
    this.logger.log(`Account deleted: ${user.email}`);
  }
}
