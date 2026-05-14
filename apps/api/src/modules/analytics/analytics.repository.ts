import { Injectable } from '@nestjs/common';
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
}
