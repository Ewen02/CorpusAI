import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { prisma, AIStatus, AccessStatus } from '@corpusai/database';
import * as bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { assertCanCreateAI, assertCanAddEndUser } from '../../shared/subscription-checks';
import { getStartDateForPeriod, getDaysForPeriod } from '../../shared/date-utils';
import { CreateAIDto } from './dto/create-ai.dto';
import { UpdateAIDto } from './dto/update-ai.dto';
import { RagService } from '../rag/rag.service';
import { TextGenerationService } from '../rag/text-generation.service';

export interface PaginationOptions {
  skip?: number;
  take?: number;
}

@Injectable()
export class AIsService {
  private readonly logger = new Logger(AIsService.name);

  constructor(
    private readonly ragService: RagService,
    private readonly textGenerationService: TextGenerationService
  ) {}

  async findAll(userId: string, options?: PaginationOptions) {
    const { skip = 0, take = 50 } = options ?? {};

    return prisma.aI.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        status: true,
        accessType: true,
        isPublic: true,
        documentCount: true,
        conversationCount: true,
        questionCount: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(userId: string, aiId: string) {
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
      include: {
        documents: {
          select: {
            id: true,
            filename: true,
            mimeType: true,
            size: true,
            status: true,
            chunkCount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            documents: true,
            conversations: true,
          },
        },
      },
    });

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    const { accessToken, accessCode, ...rest } = ai;
    return {
      ...rest,
      hasAccessToken: !!accessToken,
      hasAccessCode: !!accessCode,
    };
  }

  async findBySlug(slug: string) {
    const ai = await prisma.aI.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        welcomeMessage: true,
        primaryColor: true,
        logo: true,
        accessType: true,
        price: true,
        status: true,
      },
    });

    if (!ai || ai.status !== AIStatus.ACTIVE) {
      throw new NotFoundException('AI not found or not active');
    }

    return ai;
  }

  async create(userId: string, dto: CreateAIDto) {
    // Check subscription limits
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        _count: { select: { ais: true } },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    assertCanCreateAI(user.subscriptionPlan, user._count.ais);

    // Check slug uniqueness
    const existingSlug = await prisma.aI.findUnique({
      where: { slug: dto.slug },
    });

    if (existingSlug) {
      throw new ConflictException('This slug is already taken');
    }

    return prisma.aI.create({
      data: {
        userId,
        slug: dto.slug,
        name: dto.name,
        description: dto.description,
        systemPrompt: dto.systemPrompt,
        welcomeMessage: dto.welcomeMessage,
        primaryColor: dto.primaryColor || '#3b82f6',
        accessType: dto.accessType,
        price: dto.price,
        maxTokens: dto.maxTokens || 1024,
        temperature: dto.temperature || 0.7,
        isPublic: dto.isPublic ?? false,
        scoreThreshold: dto.scoreThreshold ?? 0.6,
        category: dto.category,
      },
    });
  }

  async update(userId: string, aiId: string, dto: UpdateAIDto) {
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
      select: { id: true },
    });

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    return prisma.aI.update({
      where: { id: aiId },
      data: {
        name: dto.name,
        description: dto.description,
        systemPrompt: dto.systemPrompt,
        welcomeMessage: dto.welcomeMessage,
        primaryColor: dto.primaryColor,
        accessType: dto.accessType,
        price: dto.price,
        maxTokens: dto.maxTokens,
        temperature: dto.temperature,
        status: dto.status,
        isPublic: dto.isPublic,
        scoreThreshold: dto.scoreThreshold,
        category: dto.category,
      },
    });
  }

  async delete(userId: string, aiId: string) {
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
      select: { id: true },
    });

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    // Clean up Qdrant collection before deleting DB records
    try {
      await this.ragService.deleteAICollection(aiId);
    } catch (error) {
      this.logger.warn(`Failed to delete Qdrant collection for AI ${aiId}: ${error}`);
    }

    await prisma.aI.delete({
      where: { id: aiId },
    });

    return { success: true };
  }

  async generateSuggestions(userId: string, aiId: string) {
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
      select: { id: true, name: true, language: true },
    });

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    return this.textGenerationService.generateAISuggestions({
      aiId: ai.id,
      aiName: ai.name,
      language: ai.language,
    });
  }

  async getStats(userId: string, aiId: string) {
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
      select: {
        documentCount: true,
        conversationCount: true,
        questionCount: true,
        _count: {
          select: {
            documents: true,
            conversations: true,
          },
        },
      },
    });

    if (!ai) {
      throw new NotFoundException('AI not found');
    }

    return {
      documents: ai._count.documents,
      conversations: ai._count.conversations,
      questions: ai.questionCount,
    };
  }

  async getAnalytics(userId: string, aiId: string, period: '7d' | '30d' | '90d' = '30d') {
    const ai = await prisma.aI.findFirst({ where: { id: aiId, userId }, select: { id: true } });
    if (!ai) throw new NotFoundException('AI not found');

    const days = getDaysForPeriod(period);
    const startDate = getStartDateForPeriod(period);

    const stats = await prisma.dailyStats.findMany({
      where: { userId, aiId, date: { gte: startDate } },
      orderBy: { date: 'asc' },
      select: { date: true, documentCount: true, conversationCount: true, questionCount: true },
    });

    const statsMap = new Map<string, (typeof stats)[0]>();
    for (const s of stats) {
      statsMap.set(s.date.toISOString().split('T')[0]!, s);
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
    const sumMetric = (arr: DailyDataPoint[], key: MetricKey) =>
      arr.reduce((sum, d) => sum + d[key], 0);
    const calcTrend = (key: MetricKey): { value: number; isPositive: boolean } | null => {
      const first = sumMetric(firstHalf, key);
      const second = sumMetric(secondHalf, key);
      if (first === 0 && second === 0) return { value: 0, isPositive: true };
      if (first === 0) return null;
      const change = Math.round(((second - first) / first) * 100);
      return { value: Math.abs(change), isPositive: change >= 0 };
    };

    // Confidence distribution — chitchat (no sources) counts as HIGH
    // Aggregated in SQL to avoid fetching all messages into JS
    const [confidenceStats] = await prisma.$queryRaw<
      [{ high: bigint; medium: bigint; low: bigint }]
    >`
      SELECT
        COUNT(*) FILTER (WHERE m.sources IS NULL OR m.sources = '[]'::jsonb OR m.confidence = 'HIGH') AS high,
        COUNT(*) FILTER (WHERE m.sources IS NOT NULL AND m.sources != '[]'::jsonb AND m.confidence = 'MEDIUM') AS medium,
        COUNT(*) FILTER (WHERE m.sources IS NOT NULL AND m.sources != '[]'::jsonb AND m.confidence = 'LOW') AS low
      FROM "Message" m
      JOIN "Conversation" c ON c.id = m."conversationId"
      WHERE c."aiId" = ${aiId}
        AND m."createdAt" >= ${startDate}
        AND m.role = 'ASSISTANT'
        AND m.confidence IS NOT NULL
    `;
    const high = Number(confidenceStats?.high ?? 0);
    const medium = Number(confidenceStats?.medium ?? 0);
    const low = Number(confidenceStats?.low ?? 0);
    const totalResponses = high + medium + low;

    // Engagement
    const avgMessages = await prisma.conversation.aggregate({
      where: { aiId, createdAt: { gte: startDate } },
      _avg: { messageCount: true },
    });
    const [uniqueUsersResult] = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "endUserId") as count
      FROM "Conversation"
      WHERE "aiId" = ${aiId}
        AND "createdAt" >= ${startDate}
        AND "endUserId" IS NOT NULL
    `;

    // Knowledge base (current state, not period-filtered)
    const knowledgeBase = await prisma.document.aggregate({
      where: { aiId, status: 'INDEXED' },
      _sum: { wordCount: true, chunkCount: true, pageCount: true },
      _count: true,
    });

    return {
      daily,
      totals,
      trends: {
        documents: calcTrend('documents'),
        conversations: calcTrend('conversations'),
        questions: calcTrend('questions'),
      },
      satisfaction: {
        rate: totalResponses > 0 ? Math.round((high / totalResponses) * 100) : null,
        high,
        medium,
        low,
        total: totalResponses,
      },
      engagement: {
        avgMessagesPerConversation: Math.round((avgMessages._avg.messageCount ?? 0) * 10) / 10,
        uniqueUsers: Number(uniqueUsersResult.count),
      },
      knowledgeBase: {
        documentCount: knowledgeBase._count,
        totalWords: knowledgeBase._sum.wordCount ?? 0,
        totalPages: knowledgeBase._sum.pageCount ?? 0,
        totalChunks: knowledgeBase._sum.chunkCount ?? 0,
      },
      unanswered: {
        count: low,
        rate: totalResponses > 0 ? Math.round((low / totalResponses) * 100) : null,
      },
    };
  }

  // ============================================
  // Access control
  // ============================================

  private async verifyOwnershipForAccess(userId: string, aiId: string) {
    const ai = await prisma.aI.findFirst({
      where: { id: aiId, userId },
      select: { id: true, slug: true, name: true },
    });
    if (!ai) throw new NotFoundException('AI not found');
    return ai;
  }

  async generateAccessToken(userId: string, aiId: string, frontendUrl: string) {
    await this.verifyOwnershipForAccess(userId, aiId);
    const nanoid = customAlphabet(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
      21
    );
    const token = nanoid();
    await prisma.aI.update({ where: { id: aiId }, data: { accessToken: token } });
    const ai = await prisma.aI.findUnique({ where: { id: aiId }, select: { slug: true } });
    return { token, url: `${frontendUrl}/chat/${ai!.slug}?t=${token}` };
  }

  async deleteAccessToken(userId: string, aiId: string) {
    await this.verifyOwnershipForAccess(userId, aiId);
    await prisma.aI.update({ where: { id: aiId }, data: { accessToken: null } });
    return { success: true };
  }

  async setAccessCode(userId: string, aiId: string, code: string) {
    await this.verifyOwnershipForAccess(userId, aiId);
    const hash = await bcrypt.hash(code, 10);
    await prisma.aI.update({ where: { id: aiId }, data: { accessCode: hash } });
    return { success: true };
  }

  async deleteAccessCode(userId: string, aiId: string) {
    await this.verifyOwnershipForAccess(userId, aiId);
    await prisma.aI.update({ where: { id: aiId }, data: { accessCode: null } });
    return { success: true };
  }

  async updateInviteOnly(userId: string, aiId: string, inviteOnly: boolean) {
    await this.verifyOwnershipForAccess(userId, aiId);
    await prisma.aI.update({ where: { id: aiId }, data: { inviteOnly } });
    return { success: true };
  }

  async setAccessMode(userId: string, aiId: string, mode: 'open' | 'token' | 'code' | 'invite') {
    await this.verifyOwnershipForAccess(userId, aiId);
    await prisma.aI.update({
      where: { id: aiId },
      data: {
        inviteOnly: mode === 'invite',
        accessToken: mode === 'token' ? undefined : null,
        accessCode: mode === 'code' ? undefined : null,
      },
    });
    return { success: true };
  }

  async getMembers(userId: string, aiId: string) {
    await this.verifyOwnershipForAccess(userId, aiId);
    return prisma.aIAccessGrant.findMany({
      where: { aiId, status: AccessStatus.ACTIVE },
      include: {
        endUser: {
          select: { id: true, email: true, name: true, emailVerified: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async inviteMember(
    userId: string,
    aiId: string,
    email: string,
    name: string | undefined,
    mailService: {
      sendInvite: (
        email: string,
        aiName: string,
        creatorName: string,
        url: string
      ) => Promise<void>;
    },
    frontendUrl: string,
    creatorName: string
  ) {
    const ai = await this.verifyOwnershipForAccess(userId, aiId);

    // Check subscription limit before creating the grant
    const [activeGrantCount, user] = await Promise.all([
      prisma.aIAccessGrant.count({
        where: { aiId, status: AccessStatus.ACTIVE },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { subscriptionPlan: true },
      }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    assertCanAddEndUser(user.subscriptionPlan, activeGrantCount);

    const endUser = await prisma.endUser.upsert({
      where: { email },
      create: { email, ...(name ? { name } : {}) },
      update: name ? { name } : {},
    });

    await prisma.aIAccessGrant.upsert({
      where: { aiId_endUserId: { aiId, endUserId: endUser.id } },
      create: { aiId, endUserId: endUser.id, status: AccessStatus.ACTIVE },
      update: { status: AccessStatus.ACTIVE, expiresAt: null },
    });

    const accessUrl = `${frontendUrl}/chat/${ai.slug}`;
    await mailService.sendInvite(email, ai.name, creatorName, accessUrl);

    return { success: true, endUserId: endUser.id };
  }

  async revokeMember(userId: string, aiId: string, endUserId: string) {
    await this.verifyOwnershipForAccess(userId, aiId);
    await prisma.aIAccessGrant.updateMany({
      where: { aiId, endUserId },
      data: { status: AccessStatus.REVOKED },
    });
    return { success: true };
  }
}
