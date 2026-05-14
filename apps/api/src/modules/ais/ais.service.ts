import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AIStatus } from '@corpusai/database';
import * as bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';
import {
  assertCanCreateAI,
  assertCanAddEndUser,
  assertCanUseLLMProvider,
} from '../../shared/subscription-checks';
import { OwnershipService } from '../../shared/ownership.service';
import {
  getStartDateForPeriod,
  getDaysForPeriod,
  type AnalyticsPeriod,
} from '../../shared/date-utils';
import { CreateAIDto } from './dto/create-ai.dto';
import { UpdateAIDto } from './dto/update-ai.dto';
import { RagService, TextGenerationService } from '../rag';
import { AIsRepository } from './ais.repository';

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
    private readonly ownership: OwnershipService,
    private readonly repo: AIsRepository
  ) {}

  async findAll(userId: string, options?: PaginationOptions) {
    const { skip = 0, take = 50 } = options ?? {};
    return this.repo.findAllByUser(userId, skip, take);
  }

  async findOne(userId: string, aiId: string) {
    const ai = await this.repo.findOneWithDocuments(aiId, userId);

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
    const normalizedUsername = username.startsWith('@') ? username.slice(1) : username;
    const ai = await this.repo.findByUserAndSlug(normalizedUsername, slug);

    if (!ai || ai.status !== AIStatus.ACTIVE) {
      throw new NotFoundException('AI not found or not active');
    }

    return ai;
  }

  async create(userId: string, dto: CreateAIDto) {
    const user = await this.repo.findUserWithAICount(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    assertCanCreateAI(user.subscriptionPlan, user._count.ais);

    if (dto.llmProvider) {
      assertCanUseLLMProvider(user.subscriptionPlan, dto.llmProvider);
    }

    const existingSlug = await this.repo.findSlugForUser(dto.slug, userId);

    if (existingSlug) {
      throw new ConflictException('This slug is already taken');
    }

    return this.repo.create(userId, dto);
  }

  async update(userId: string, aiId: string, dto: UpdateAIDto) {
    await this.ownership.verifyAIOwnership(aiId, userId);

    if (dto.llmProvider) {
      const user = await this.repo.findUserPlan(userId);
      if (!user) {
        throw new ForbiddenException('User not found');
      }
      assertCanUseLLMProvider(user.subscriptionPlan, dto.llmProvider);
    }

    return this.repo.update(aiId, dto);
  }

  async delete(userId: string, aiId: string) {
    await this.ownership.verifyAIOwnership(aiId, userId);

    try {
      await this.ragService.deleteAIVectors(aiId);
    } catch (error) {
      this.logger.warn(`Failed to delete Qdrant vectors for AI ${aiId}: ${error}`);
    }

    await this.repo.delete(aiId);
    return { success: true };
  }

  async generateSuggestions(userId: string, aiId: string) {
    const ai = await this.repo.findForSuggestions(aiId, userId);

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
    const ai = await this.repo.findStats(aiId, userId);

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

    const stats = await this.repo.findDailyStats(userId, aiId, startDate);

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

    const [confidenceStats] = await this.repo.getConfidenceStats(aiId, startDate);
    const high = Number(confidenceStats?.high ?? 0);
    const medium = Number(confidenceStats?.medium ?? 0);
    const low = Number(confidenceStats?.low ?? 0);
    const totalResponses = high + medium + low;

    const [feedbackStats] = await this.repo.getFeedbackStats(aiId, startDate);
    const feedbackPositive = Number(feedbackStats?.positive ?? 0);
    const feedbackNegative = Number(feedbackStats?.negative ?? 0);
    const feedbackTotal = feedbackPositive + feedbackNegative;

    const avgMessages = await this.repo.getAvgMessagesPerConversation(aiId, startDate);
    const [uniqueUsersResult] = await this.repo.getUniqueUsers(aiId, startDate);

    const knowledgeBase = await this.repo.getKnowledgeBase(aiId);

    const topQuestions = await this.repo.getTopQuestions(aiId, startDate);

    const retention = await this.repo.getRetention(aiId, startDate);

    const [funnelData] = await this.repo.getFunnelData(aiId, startDate);

    const rawDocUsage = await this.repo.getDocumentUsage(aiId, startDate);

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

    const doc = await this.repo.findDocumentForAI(documentId, aiId);
    if (!doc) throw new NotFoundException('Document not found');

    const startDate = getStartDateForPeriod(period);
    return this.repo.getDocumentChunkUsage(documentId, aiId, startDate);
  }

  // ============================================
  // Access control
  // ============================================

  private async verifyOwnershipForAccess(userId: string, aiId: string) {
    const ai = await this.repo.findForAccess(aiId, userId);
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
    await this.repo.updateAccessToken(aiId, token);
    const ai = await this.repo.findWithUsername(aiId);
    return { token, url: `${frontendUrl}/chat/${ai!.user.username}/${ai!.slug}?t=${token}` };
  }

  async deleteAccessToken(userId: string, aiId: string) {
    await this.verifyOwnershipForAccess(userId, aiId);
    await this.repo.updateAccessToken(aiId, null);
    return { success: true };
  }

  async setAccessCode(userId: string, aiId: string, code: string) {
    await this.verifyOwnershipForAccess(userId, aiId);
    const hash = await bcrypt.hash(code, 10);
    await this.repo.updateAccessCode(aiId, hash);
    return { success: true };
  }

  async deleteAccessCode(userId: string, aiId: string) {
    await this.verifyOwnershipForAccess(userId, aiId);
    await this.repo.updateAccessCode(aiId, null);
    return { success: true };
  }

  async updateInviteOnly(userId: string, aiId: string, inviteOnly: boolean) {
    await this.verifyOwnershipForAccess(userId, aiId);
    await this.repo.updateInviteOnly(aiId, inviteOnly);
    return { success: true };
  }

  async setAccessMode(userId: string, aiId: string, mode: 'open' | 'token' | 'code' | 'invite') {
    await this.verifyOwnershipForAccess(userId, aiId);
    await this.repo.updateAccessMode(aiId, {
      inviteOnly: mode === 'invite',
      accessToken: mode === 'token' ? undefined : null,
      accessCode: mode === 'code' ? undefined : null,
    });
    return { success: true };
  }

  async getMembers(userId: string, aiId: string) {
    await this.verifyOwnershipForAccess(userId, aiId);
    return this.repo.findActiveMembers(aiId);
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

    const [activeGrantCount, user] = await Promise.all([
      this.repo.countActiveGrants(aiId),
      this.repo.findUserPlan(userId),
    ]);

    if (!user) throw new NotFoundException('User not found');
    assertCanAddEndUser(user.subscriptionPlan, activeGrantCount);

    const endUser = await this.repo.upsertEndUser(email, name);
    await this.repo.upsertAccessGrant(aiId, endUser.id);

    const owner = await this.repo.findUserUsername(userId);
    const accessUrl = `${frontendUrl}/chat/${owner!.username}/${ai.slug}`;
    await mailService.sendInvite(email, ai.name, creatorName, accessUrl);

    return { success: true, endUserId: endUser.id };
  }

  async revokeMember(userId: string, aiId: string, endUserId: string) {
    await this.verifyOwnershipForAccess(userId, aiId);
    await this.repo.revokeGrant(aiId, endUserId);
    return { success: true };
  }
}
