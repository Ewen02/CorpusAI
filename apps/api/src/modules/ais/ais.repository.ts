import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';
import { AccessStatus } from '@corpusai/database';
import type { CreateAIDto } from './dto/create-ai.dto';
import type { UpdateAIDto } from './dto/update-ai.dto';

// ============================================================================
// SELECT CONSTANTS — NEVER include secrets (accessToken, accessCode) unless
// explicitly required for owner-side access management.
// ============================================================================

/** Safe fields returned to the AI owner (dashboard) — no secrets exposed. */
const AI_OWNER_SAFE_SELECT = {
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
} as const;

/** Full configuration fields returned to the AI owner, includes secret flags only. */
const AI_OWNER_DETAIL_SELECT = {
  id: true,
  userId: true,
  slug: true,
  name: true,
  description: true,
  systemPrompt: true,
  status: true,
  category: true,
  language: true,
  welcomeMessage: true,
  primaryColor: true,
  logo: true,
  maxTokens: true,
  temperature: true,
  scoreThreshold: true,
  llmModel: true,
  memoryEnabled: true,
  accessType: true,
  price: true,
  isPublic: true,
  inviteOnly: true,
  documentCount: true,
  conversationCount: true,
  questionCount: true,
  createdAt: true,
  updatedAt: true,
  // accessToken / accessCode included to compute hasAccessToken / hasAccessCode flags
  // (stripped by service before returning to client)
  accessToken: true,
  accessCode: true,
} as const;

/** Public fields safe to expose for an AI shown to end-users (widget / chat page). */
const AI_PUBLIC_SELECT = {
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
} as const;

@Injectable()
export class AIsRepository {
  constructor(private readonly db: PrismaService) {}

  async findAllByUser(userId: string, skip: number, take: number) {
    return this.db.client.aI.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      select: AI_OWNER_SAFE_SELECT,
    });
  }

  async findOneWithDocuments(aiId: string, userId: string) {
    return this.db.client.aI.findFirst({
      where: { id: aiId, userId },
      select: {
        ...AI_OWNER_DETAIL_SELECT,
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
          select: { documents: true, conversations: true },
        },
      },
    });
  }

  async findByUserAndSlug(username: string, slug: string) {
    return this.db.client.aI.findFirst({
      where: { slug, user: { username }, deletedAt: null },
      select: AI_PUBLIC_SELECT,
    });
  }

  async findUserWithAICount(userId: string) {
    return this.db.client.user.findUnique({
      where: { id: userId },
      select: {
        subscriptionPlan: true,
        _count: { select: { ais: true } },
      },
    });
  }

  async findSlugForUser(slug: string, userId: string) {
    return this.db.client.aI.findFirst({
      where: { slug, userId },
      select: { id: true },
    });
  }

  async create(userId: string, dto: CreateAIDto) {
    return this.db.client.aI.create({
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
      select: AI_OWNER_SAFE_SELECT,
    });
  }

  async update(aiId: string, dto: UpdateAIDto) {
    return this.db.client.aI.update({
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
      select: AI_OWNER_SAFE_SELECT,
    });
  }

  async delete(aiId: string) {
    return this.db.client.aI.delete({ where: { id: aiId } });
  }

  async findForSuggestions(aiId: string, userId: string) {
    return this.db.client.aI.findFirst({
      where: { id: aiId, userId },
      select: { id: true, name: true, language: true },
    });
  }

  async findStats(aiId: string, userId: string) {
    return this.db.client.aI.findFirst({
      where: { id: aiId, userId },
      select: {
        documentCount: true,
        conversationCount: true,
        questionCount: true,
        _count: { select: { documents: true, conversations: true } },
      },
    });
  }

  async findDailyStats(userId: string, aiId: string, startDate: Date) {
    return this.db.client.dailyStats.findMany({
      where: { userId, aiId, date: { gte: startDate } },
      orderBy: { date: 'asc' },
      select: { date: true, documentCount: true, conversationCount: true, questionCount: true },
    });
  }

  async getConfidenceStats(aiId: string, startDate: Date) {
    return this.db.client.$queryRaw<[{ high: bigint; medium: bigint; low: bigint }]>`
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
  }

  async getFeedbackStats(aiId: string, startDate: Date) {
    return this.db.client.$queryRaw<[{ positive: bigint; negative: bigint }]>`
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
  }

  async getAvgMessagesPerConversation(aiId: string, startDate: Date) {
    return this.db.client.conversation.aggregate({
      where: { aiId, createdAt: { gte: startDate } },
      _avg: { messageCount: true },
    });
  }

  async getUniqueUsers(aiId: string, startDate: Date) {
    return this.db.client.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT "endUserId") as count
      FROM "Conversation"
      WHERE "aiId" = ${aiId}
        AND "createdAt" >= ${startDate}
        AND "endUserId" IS NOT NULL
    `;
  }

  async getKnowledgeBase(aiId: string) {
    return this.db.client.document.aggregate({
      where: { aiId, status: 'INDEXED' },
      _sum: { wordCount: true, chunkCount: true, pageCount: true },
      _count: true,
    });
  }

  async getTopQuestions(aiId: string, startDate: Date) {
    return this.db.client.$queryRaw<{ content: string; count: bigint }[]>`
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
  }

  async getRetention(aiId: string, startDate: Date) {
    return this.db.client.$queryRaw<{ day: Date; newUsers: bigint; returningUsers: bigint }[]>`
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
  }

  async getFunnelData(aiId: string, startDate: Date) {
    return this.db.client.$queryRaw<
      [{ documents: bigint; firstQuestion: bigint; engaged: bigint }]
    >`
      SELECT
        (SELECT COUNT(*) FROM "Document" WHERE "aiId" = ${aiId} AND status = 'INDEXED') as documents,
        (SELECT COUNT(*) FROM "Conversation" WHERE "aiId" = ${aiId} AND "createdAt" >= ${startDate} AND "messageCount" >= 1) as "firstQuestion",
        (SELECT COUNT(*) FROM "Conversation" WHERE "aiId" = ${aiId} AND "createdAt" >= ${startDate} AND "messageCount" >= 5) as engaged
    `;
  }

  async getDocumentUsage(aiId: string, startDate: Date) {
    return this.db.client.$queryRaw<
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
  }

  async getDocumentChunkUsage(documentId: string, aiId: string, startDate: Date) {
    return this.db.client.$queryRaw<
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

  async findDocumentForAI(documentId: string, aiId: string) {
    return this.db.client.document.findFirst({
      where: { id: documentId, aiId },
      select: { id: true },
    });
  }

  // Access control
  async findForAccess(aiId: string, userId: string) {
    return this.db.client.aI.findFirst({
      where: { id: aiId, userId },
      select: { id: true, slug: true, name: true },
    });
  }

  async updateAccessToken(aiId: string, token: string | null) {
    return this.db.client.aI.update({
      where: { id: aiId },
      data: { accessToken: token },
      select: { id: true },
    });
  }

  async findWithUsername(aiId: string) {
    return this.db.client.aI.findUnique({
      where: { id: aiId },
      select: { slug: true, user: { select: { username: true } } },
    });
  }

  async updateAccessCode(aiId: string, hash: string | null) {
    return this.db.client.aI.update({
      where: { id: aiId },
      data: { accessCode: hash },
      select: { id: true },
    });
  }

  async updateInviteOnly(aiId: string, inviteOnly: boolean) {
    return this.db.client.aI.update({
      where: { id: aiId },
      data: { inviteOnly },
      select: { id: true, inviteOnly: true },
    });
  }

  async updateAccessMode(
    aiId: string,
    data: { inviteOnly: boolean; accessToken?: string | null; accessCode?: string | null }
  ) {
    return this.db.client.aI.update({
      where: { id: aiId },
      data,
      select: { id: true, inviteOnly: true },
    });
  }

  async findActiveMembers(aiId: string) {
    return this.db.client.aIAccessGrant.findMany({
      where: { aiId, status: AccessStatus.ACTIVE },
      select: {
        id: true,
        aiId: true,
        endUserId: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        endUser: {
          select: { id: true, email: true, name: true, emailVerified: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countActiveGrants(aiId: string) {
    return this.db.client.aIAccessGrant.count({
      where: { aiId, status: AccessStatus.ACTIVE },
    });
  }

  async findUserPlan(userId: string) {
    return this.db.client.user.findUnique({
      where: { id: userId },
      select: { subscriptionPlan: true },
    });
  }

  async findUserUsername(userId: string) {
    return this.db.client.user.findUnique({
      where: { id: userId },
      select: { username: true },
    });
  }

  async upsertEndUser(email: string, name?: string) {
    return this.db.client.endUser.upsert({
      where: { email },
      create: { email, ...(name ? { name } : {}) },
      update: name ? { name } : {},
      select: { id: true, email: true, name: true },
    });
  }

  async upsertAccessGrant(aiId: string, endUserId: string) {
    return this.db.client.aIAccessGrant.upsert({
      where: { aiId_endUserId: { aiId, endUserId } },
      create: { aiId, endUserId, status: AccessStatus.ACTIVE },
      update: { status: AccessStatus.ACTIVE, expiresAt: null },
      select: { id: true, status: true, expiresAt: true },
    });
  }

  async revokeGrant(aiId: string, endUserId: string) {
    return this.db.client.aIAccessGrant.updateMany({
      where: { aiId, endUserId },
      data: { status: AccessStatus.REVOKED },
    });
  }
}
