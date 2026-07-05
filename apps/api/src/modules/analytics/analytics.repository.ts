import { Injectable } from '@nestjs/common';
import type { ConfidenceLevel } from '@corpusai/database';
import { PrismaService } from '../../infrastructure/database';

/**
 * Raw aggregate row returned by the daily usage roll-up query.
 *
 * `day` is a date-only Postgres value (no time component). Token counts are
 * returned as BigInt because Postgres `SUM(int)` returns `numeric`.
 */
export interface DailyUsageRow {
  day: Date;
  tokensIn: bigint | null;
  tokensOut: bigint | null;
  cost: number | null;
}

/** Per-model aggregate row. `model` is nullable for legacy messages. */
export interface ModelUsageRow {
  model: string | null;
  tokens: bigint | null;
  cost: number | null;
}

/** Period-wide totals row. */
export interface TotalsRow {
  totalTokensIn: bigint | null;
  totalTokensOut: bigint | null;
  totalCostUsd: number | null;
}

/** Quality counters over the period (BigInt because Postgres COUNT returns bigint). */
export interface QualityTotalsRow {
  assistantMessages: bigint | null;
  negativeFeedback: bigint | null;
  positiveFeedback: bigint | null;
  lowConfidence: bigint | null;
}

/** Assistant message flagged as failing (negative feedback OR low confidence). */
export interface FlaggedMessageRow {
  id: string;
  conversationId: string;
  createdAt: Date;
  content: string;
  feedback: string | null;
  confidence: ConfidenceLevel | null;
  /** Raw Json column — callers must narrow (array check) before use. */
  sources: unknown;
}

/** USER message used to reconstruct the question preceding an assistant answer. */
export interface UserQuestionRow {
  conversationId: string;
  createdAt: Date;
  content: string;
}

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly db: PrismaService) {}

  /**
   * Returns the period-wide totals for assistant messages owned by `userId`.
   *
   * When `aiId` is provided, the aggregate is scoped to that single AI. Both
   * filters are applied through the Conversation → AI join so that cost
   * data never leaks across users.
   */
  async getTotals(
    userId: string,
    startDate: Date,
    endDate: Date,
    aiId: string | null
  ): Promise<TotalsRow> {
    const rows = await this.db.client.$queryRaw<TotalsRow[]>`
      SELECT
        COALESCE(SUM(m."tokensIn"), 0)::bigint  AS "totalTokensIn",
        COALESCE(SUM(m."tokensOut"), 0)::bigint AS "totalTokensOut",
        COALESCE(SUM(m.cost), 0)::float8        AS "totalCostUsd"
      FROM "Message" m
      JOIN "Conversation" c ON c.id = m."conversationId"
      JOIN "AI" a            ON a.id = c."aiId"
      WHERE a."userId" = ${userId}
        AND m.role = 'ASSISTANT'
        AND m."createdAt" >= ${startDate}
        AND m."createdAt" <  ${endDate}
        AND (${aiId}::text IS NULL OR c."aiId" = ${aiId})
    `;
    return (
      rows[0] ?? {
        totalTokensIn: 0n,
        totalTokensOut: 0n,
        totalCostUsd: 0,
      }
    );
  }

  /**
   * Returns the daily roll-up (one row per day where at least one assistant
   * message exists). Caller is responsible for back-filling zero-rows for days
   * with no traffic.
   */
  async getDailyUsage(
    userId: string,
    startDate: Date,
    endDate: Date,
    aiId: string | null
  ): Promise<DailyUsageRow[]> {
    return this.db.client.$queryRaw<DailyUsageRow[]>`
      SELECT
        DATE(m."createdAt")                    AS day,
        COALESCE(SUM(m."tokensIn"), 0)::bigint  AS "tokensIn",
        COALESCE(SUM(m."tokensOut"), 0)::bigint AS "tokensOut",
        COALESCE(SUM(m.cost), 0)::float8        AS cost
      FROM "Message" m
      JOIN "Conversation" c ON c.id = m."conversationId"
      JOIN "AI" a            ON a.id = c."aiId"
      WHERE a."userId" = ${userId}
        AND m.role = 'ASSISTANT'
        AND m."createdAt" >= ${startDate}
        AND m."createdAt" <  ${endDate}
        AND (${aiId}::text IS NULL OR c."aiId" = ${aiId})
      GROUP BY DATE(m."createdAt")
      ORDER BY DATE(m."createdAt") ASC
    `;
  }

  /**
   * Returns the per-model roll-up over the same period. `tokens` is the sum of
   * prompt + completion tokens.
   */
  async getByModel(
    userId: string,
    startDate: Date,
    endDate: Date,
    aiId: string | null
  ): Promise<ModelUsageRow[]> {
    return this.db.client.$queryRaw<ModelUsageRow[]>`
      SELECT
        m.model,
        COALESCE(SUM(COALESCE(m."tokensIn", 0) + COALESCE(m."tokensOut", 0)), 0)::bigint AS tokens,
        COALESCE(SUM(m.cost), 0)::float8 AS cost
      FROM "Message" m
      JOIN "Conversation" c ON c.id = m."conversationId"
      JOIN "AI" a            ON a.id = c."aiId"
      WHERE a."userId" = ${userId}
        AND m.role = 'ASSISTANT'
        AND m."createdAt" >= ${startDate}
        AND m."createdAt" <  ${endDate}
        AND (${aiId}::text IS NULL OR c."aiId" = ${aiId})
      GROUP BY m.model
      ORDER BY cost DESC NULLS LAST
    `;
  }

  /**
   * Returns the quality counters for a single AI over the period.
   *
   * Scoping to the AI happens through the Conversation join; the caller is
   * responsible for verifying ownership of `aiId` beforehand.
   */
  async getQualityTotals(aiId: string, startDate: Date, endDate: Date): Promise<QualityTotalsRow> {
    const rows = await this.db.client.$queryRaw<QualityTotalsRow[]>`
      SELECT
        COUNT(*)::bigint                                          AS "assistantMessages",
        COUNT(*) FILTER (WHERE m.feedback = 'negative')::bigint   AS "negativeFeedback",
        COUNT(*) FILTER (WHERE m.feedback = 'positive')::bigint   AS "positiveFeedback",
        COUNT(*) FILTER (WHERE m.confidence = 'LOW')::bigint      AS "lowConfidence"
      FROM "Message" m
      JOIN "Conversation" c ON c.id = m."conversationId"
      WHERE c."aiId" = ${aiId}
        AND m.role = 'ASSISTANT'
        AND m."createdAt" >= ${startDate}
        AND m."createdAt" <  ${endDate}
    `;
    return (
      rows[0] ?? {
        assistantMessages: 0n,
        negativeFeedback: 0n,
        positiveFeedback: 0n,
        lowConfidence: 0n,
      }
    );
  }

  /**
   * Returns assistant messages flagged as failing (negative feedback OR low
   * confidence), most recent first, capped at `limit` rows.
   */
  async findFlaggedAssistantMessages(
    aiId: string,
    startDate: Date,
    endDate: Date,
    limit: number
  ): Promise<FlaggedMessageRow[]> {
    return this.db.client.message.findMany({
      where: {
        conversation: { aiId },
        role: 'ASSISTANT',
        createdAt: { gte: startDate, lt: endDate },
        OR: [{ feedback: 'negative' }, { confidence: 'LOW' }],
      },
      select: {
        id: true,
        conversationId: true,
        createdAt: true,
        content: true,
        feedback: true,
        confidence: true,
        sources: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Returns all USER messages of the given conversations (oldest first) so the
   * service can pair each flagged answer with the question that preceded it.
   * Single query — avoids one lookup per flagged message (N+1).
   */
  async findUserMessagesForConversations(
    conversationIds: string[],
    endDate: Date
  ): Promise<UserQuestionRow[]> {
    if (conversationIds.length === 0) return [];
    return this.db.client.message.findMany({
      where: {
        conversationId: { in: conversationIds },
        role: 'USER',
        createdAt: { lt: endDate },
      },
      select: {
        conversationId: true,
        createdAt: true,
        content: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
