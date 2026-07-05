import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database';

export interface LatencyAggregate {
  totalMessages: number;
  p50: number;
  p95: number;
  p99: number;
  errorCount: number;
}

@Injectable()
export class SLARepository {
  constructor(private readonly db: PrismaService) {}

  /**
   * Returns latency percentiles + total assistant messages + error count
   * over the given window. Uses Postgres `percentile_cont` so the math runs
   * in-database (millions of rows ok).
   */
  async getLatencyAggregate(since: Date): Promise<LatencyAggregate> {
    // Single scan of "Message": `total` + percentiles are restricted to rows
    // with a non-null latency (matching the original percentile query), while
    // the error count uses a FILTER over LOW-confidence rows (independent of
    // latencyMs, matching the original error query). Semantics are identical
    // to the previous two-query version, in one round trip.
    const rows = await this.db.client.$queryRaw<
      Array<{
        total: bigint;
        p50: number | null;
        p95: number | null;
        p99: number | null;
        errorCount: bigint;
      }>
    >`
      SELECT
        COUNT(*) FILTER (WHERE "latencyMs" IS NOT NULL)::bigint AS total,
        PERCENTILE_CONT(0.5)  WITHIN GROUP (ORDER BY "latencyMs") AS p50,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY "latencyMs") AS p95,
        PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY "latencyMs") AS p99,
        COUNT(*) FILTER (WHERE "confidence" = 'LOW')::bigint AS "errorCount"
      FROM "Message"
      WHERE "role" = 'ASSISTANT'
        AND "createdAt" >= ${since};
    `;

    const row = rows[0];

    return {
      totalMessages: row ? Number(row.total) : 0,
      p50: row?.p50 ?? 0,
      p95: row?.p95 ?? 0,
      p99: row?.p99 ?? 0,
      errorCount: row ? Number(row.errorCount) : 0,
    };
  }
}
