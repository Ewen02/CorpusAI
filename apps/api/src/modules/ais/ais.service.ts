import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { prisma, AIStatus, AccessStatus } from '@corpusai/database';
import * as bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import { assertCanCreateAI, assertCanAddEndUser } from '../../shared/subscription-checks';
import { OwnershipService } from '../../shared/ownership.service';
import {
  getStartDateForPeriod,
  getDaysForPeriod,
  type AnalyticsPeriod,
} from '../../shared/date-utils';
import { CreateAIDto } from './dto/create-ai.dto';
import { UpdateAIDto } from './dto/update-ai.dto';
import { RagService, TextGenerationService } from '../rag';

export interface PaginationOptions {
  skip?: number;
  take?: number;
}

@Injectable()
export class AIsService {
  private readonly logger = new Logger(AIsService.name);

  constructor(
    private readonly ragService: RagService,
    private readonly textGenerationService: TextGenerationService,
    private readonly ownership: OwnershipService
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

  async findByUserAndSlug(username: string, slug: string) {
    // Tolerate leading '@' in username (clients may pass the URL prefix as-is)
    const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
    const ai = await prisma.aI.findFirst({
      where: { slug, user: { username: normalizedUsername }, deletedAt: null },
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

    // Check slug uniqueness per user
    const existingSlug = await prisma.aI.findFirst({
      where: { slug: dto.slug, userId },
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
        language: dto.language,
        memoryEnabled: dto.memoryEnabled ?? false,
        llmModel: dto.llmModel,
      },
    });
  }

  async update(userId: string, aiId: string, dto: UpdateAIDto) {
    await this.ownership.verifyAIOwnership(aiId, userId);

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
        language: dto.language,
        memoryEnabled: dto.memoryEnabled,
        llmModel: dto.llmModel,
      },
    });
  }

  async delete(userId: string, aiId: string) {
    await this.ownership.verifyAIOwnership(aiId, userId);

    // Clean up Qdrant vectors before deleting DB records
    try {
      await this.ragService.deleteAIVectors(aiId);
    } catch (error) {
      this.logger.warn(`Failed to delete Qdrant vectors for AI ${aiId}: ${error}`);
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

  async getAnalytics(userId: string, aiId: string, period: AnalyticsPeriod = '30d') {
    await this.ownership.verifyAIOwnership(aiId, userId);

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

    // User feedback (thumbs up/down)
    const [feedbackStats] = await prisma.$queryRaw<[{ positive: bigint; negative: bigint }]>`
      SELECT
        COUNT(*) FILTER (WHERE m.feedback = 'positive') AS positive,
        COUNT(*) FILTER (WHERE m.feedback = 'negative') AS negative
      FROM "Message" m
      JOIN "Conversation" c ON c.id = m."conversationId"
      WHERE c."aiId" = ${aiId}
        AND m."createdAt" >= ${startDate}
        AND m.role = 'ASSISTANT'
        AND m.feedback IS NOT NULL
    `;
    const feedbackPositive = Number(feedbackStats?.positive ?? 0);
    const feedbackNegative = Number(feedbackStats?.negative ?? 0);
    const feedbackTotal = feedbackPositive + feedbackNegative;

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

    // Top questions — most frequently asked (exact match, normalized)
    const topQuestions = await prisma.$queryRaw<{ content: string; count: bigint }[]>`
      SELECT LOWER(TRIM(m.content)) as content, COUNT(*) as count
      FROM "Message" m
      JOIN "Conversation" c ON c.id = m."conversationId"
      WHERE c."aiId" = ${aiId}
        AND m."createdAt" >= ${startDate}
        AND m.role = 'USER'
      GROUP BY LOWER(TRIM(m.content))
      ORDER BY count DESC
      LIMIT 10
    `;

    // Retention — new vs returning end-users per day
    const retention = await prisma.$queryRaw<
      { day: Date; newUsers: bigint; returningUsers: bigint }[]
    >`
      WITH first_seen AS (
        SELECT "endUserId", MIN(DATE("createdAt")) as first_date
        FROM "Conversation"
        WHERE "aiId" = ${aiId} AND "endUserId" IS NOT NULL
        GROUP BY "endUserId"
      ),
      daily_users AS (
        SELECT DATE(c."createdAt") as day, c."endUserId"
        FROM "Conversation" c
        WHERE c."aiId" = ${aiId} AND c."endUserId" IS NOT NULL AND c."createdAt" >= ${startDate}
        GROUP BY 1, 2
      )
      SELECT du.day,
        COUNT(*) FILTER (WHERE fs.first_date = du.day) as "newUsers",
        COUNT(*) FILTER (WHERE fs.first_date < du.day) as "returningUsers"
      FROM daily_users du
      JOIN first_seen fs ON fs."endUserId" = du."endUserId"
      GROUP BY du.day ORDER BY du.day
    `;

    // Funnel — documents → first question → engaged conversations (5+ messages)
    const [funnelData] = await prisma.$queryRaw<
      [{ documents: bigint; firstQuestion: bigint; engaged: bigint }]
    >`
      SELECT
        (SELECT COUNT(*) FROM "Document" WHERE "aiId" = ${aiId} AND status = 'INDEXED') as documents,
        (SELECT COUNT(*) FROM "Conversation" WHERE "aiId" = ${aiId} AND "createdAt" >= ${startDate} AND "messageCount" >= 1) as "firstQuestion",
        (SELECT COUNT(*) FROM "Conversation" WHERE "aiId" = ${aiId} AND "createdAt" >= ${startDate} AND "messageCount" >= 5) as engaged
    `;

    // Document usage — most cited documents from Message.sources JSONB
    const rawDocUsage = await prisma.$queryRaw<
      {
        id: string;
        filename: string;
        totalChunks: number;
        citations: number;
        uniqueChunks: number;
      }[]
    >`
      SELECT d.id, d.filename,
             (SELECT COUNT(*) FROM "Chunk" WHERE "documentId" = d.id)::int as "totalChunks",
             COUNT(*)::int as citations,
             COUNT(DISTINCT c.id)::int as "uniqueChunks"
      FROM "Message" m,
           jsonb_array_elements(m.sources) AS sources
      JOIN "Chunk" c ON c."qdrantPointId" = (sources->>'chunkId')
      JOIN "Document" d ON d.id = c."documentId"
      WHERE m."conversationId" IN (
        SELECT id FROM "Conversation" WHERE "aiId" = ${aiId}
      )
        AND m."createdAt" >= ${startDate}
        AND m.sources IS NOT NULL
        AND m.sources != '[]'::jsonb
      GROUP BY d.id, d.filename
      ORDER BY citations DESC
      LIMIT 20
    `;

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
      feedbackSatisfaction: {
        positive: feedbackPositive,
        negative: feedbackNegative,
        total: feedbackTotal,
        rate: feedbackTotal > 0 ? Math.round((feedbackPositive / feedbackTotal) * 100) : null,
      },
      topQuestions: topQuestions.map((q) => ({ content: q.content, count: Number(q.count) })),
      retention: retention.map((r) => ({
        date: r.day.toISOString().split('T')[0]!,
        newUsers: Number(r.newUsers),
        returningUsers: Number(r.returningUsers),
      })),
      funnel: {
        documentsUploaded: Number(funnelData?.documents ?? 0),
        firstQuestion: Number(funnelData?.firstQuestion ?? 0),
        engagedConversations: Number(funnelData?.engaged ?? 0),
      },
      documentUsage: rawDocUsage.map((row) => ({
        ...row,
        coveragePercent:
          row.totalChunks > 0 ? Math.round((row.uniqueChunks / row.totalChunks) * 100) : 0,
      })),
    };
  }

  async getDocumentChunkUsage(
    userId: string,
    aiId: string,
    documentId: string,
    period: AnalyticsPeriod = '30d'
  ) {
    await this.ownership.verifyAIOwnership(aiId, userId);

    const doc = await prisma.document.findFirst({
      where: { id: documentId, aiId },
      select: { id: true },
    });
    if (!doc) throw new NotFoundException('Document not found');

    const startDate = getStartDateForPeriod(period);

    return prisma.$queryRaw<
      {
        id: string;
        position: number;
        pageNumber: number | null;
        excerpt: string;
        citations: number;
      }[]
    >`
      SELECT c.id, c.position, c."pageNumber", LEFT(c.content, 150) as excerpt,
             COUNT(*)::int as citations
      FROM "Message" m,
           jsonb_array_elements(m.sources) AS sources
      JOIN "Chunk" c ON c."qdrantPointId" = (sources->>'chunkId')
      WHERE c."documentId" = ${documentId}
        AND m."conversationId" IN (SELECT id FROM "Conversation" WHERE "aiId" = ${aiId})
        AND m."createdAt" >= ${startDate}
        AND m.sources IS NOT NULL
        AND m.sources != '[]'::jsonb
      GROUP BY c.id, c.position, c."pageNumber", c.content
      ORDER BY citations DESC
    `;
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
    const ai = await prisma.aI.findUnique({
      where: { id: aiId },
      select: { slug: true, user: { select: { username: true } } },
    });
    return { token, url: `${frontendUrl}/chat/${ai!.user.username}/${ai!.slug}?t=${token}` };
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

    const owner = await prisma.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
    const accessUrl = `${frontendUrl}/chat/${owner!.username}/${ai.slug}`;
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
