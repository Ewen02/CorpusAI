import { BadRequestException, Injectable } from '@nestjs/common';
import { OwnershipService } from '../../shared';
import { AnalyticsRepository } from './analytics.repository';

/**
 * Maximum number of days that can be returned in a single `usage` response.
 *
 * This bounds the daily array size and keeps the dashboard render predictable.
 * Caller must paginate (window the dates) if a longer history is required.
 */
const MAX_USAGE_WINDOW_DAYS = 90;
const DAY_MS = 86_400_000;
/** Default window when neither startDate nor endDate is provided. */
const DEFAULT_WINDOW_DAYS = 30;

/** Public shape of the per-day cost/token breakdown. */
export interface DailyUsagePoint {
  date: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
}

/** Public shape of the per-model cost rollup. */
export interface ModelUsagePoint {
  model: string;
  tokens: number;
  cost: number;
}

/** Full response payload for `GET /analytics/usage`. */
export interface UsageBreakdown {
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  daily: DailyUsagePoint[];
  byModel: ModelUsagePoint[];
}

/** Coerces a (possibly nullable) BigInt to a finite JS number. */
function toNumber(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === 'bigint' ? Number(value) : value;
}

/** Returns the UTC midnight date (YYYY-MM-DD) for the given Date. */
function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Rounds a USD amount to 4 decimal places (matches persistence precision). */
function roundUsd(value: number): number {
  return Number.parseFloat(value.toFixed(4));
}

@Injectable()
export class AnalyticsService {
  constructor(
    private readonly repo: AnalyticsRepository,
    private readonly ownership: OwnershipService
  ) {}

  /**
   * Returns the usage breakdown (tokens + cost) over the requested window.
   *
   * Contract:
   *  - The caller is always identified via `userId`. Aggregates are scoped to
   *    AIs owned by that user; cross-tenant leakage is impossible.
   *  - When `aiId` is provided, ownership is verified before querying.
   *  - The window is clamped to {@link MAX_USAGE_WINDOW_DAYS}; a request beyond
   *    that throws {@link BadRequestException}.
   *  - `daily` always covers every day in the window (zero-filled).
   */
  async getUsage(
    userId: string,
    params: { aiId?: string; startDate?: string; endDate?: string }
  ): Promise<UsageBreakdown> {
    const { startDate, endDate } = this.resolveWindow(params.startDate, params.endDate);
    const aiId = params.aiId?.trim() ? params.aiId.trim() : null;

    if (aiId) {
      await this.ownership.verifyAIOwnership(aiId, userId);
    }

    const [totals, daily, byModel] = await Promise.all([
      this.repo.getTotals(userId, startDate, endDate, aiId),
      this.repo.getDailyUsage(userId, startDate, endDate, aiId),
      this.repo.getByModel(userId, startDate, endDate, aiId),
    ]);

    return {
      totalTokensIn: toNumber(totals.totalTokensIn),
      totalTokensOut: toNumber(totals.totalTokensOut),
      totalCostUsd: roundUsd(toNumber(totals.totalCostUsd)),
      daily: this.fillDaily(daily, startDate, endDate),
      byModel: byModel.map((row) => ({
        model: row.model ?? 'unknown',
        tokens: toNumber(row.tokens),
        cost: roundUsd(toNumber(row.cost)),
      })),
    };
  }

  /**
   * Resolves the requested window into a half-open `[start, end)` interval.
   *
   * Throws BadRequestException when the inputs are invalid or the window
   * exceeds {@link MAX_USAGE_WINDOW_DAYS}.
   */
  private resolveWindow(
    rawStart: string | undefined,
    rawEnd: string | undefined
  ): { startDate: Date; endDate: Date } {
    const endDate = rawEnd ? new Date(rawEnd) : new Date();
    if (Number.isNaN(endDate.getTime())) {
      throw new BadRequestException('Invalid endDate');
    }

    const startDate = rawStart
      ? new Date(rawStart)
      : new Date(endDate.getTime() - DEFAULT_WINDOW_DAYS * DAY_MS);
    if (Number.isNaN(startDate.getTime())) {
      throw new BadRequestException('Invalid startDate');
    }

    if (startDate >= endDate) {
      throw new BadRequestException('startDate must be strictly before endDate');
    }

    const windowDays = Math.ceil((endDate.getTime() - startDate.getTime()) / DAY_MS);
    if (windowDays > MAX_USAGE_WINDOW_DAYS) {
      throw new BadRequestException(
        `Window exceeds maximum of ${MAX_USAGE_WINDOW_DAYS} days (requested ${windowDays})`
      );
    }

    return { startDate, endDate };
  }

  /**
   * Back-fills missing days with zero values so the daily array covers the
   * full requested window. This keeps the frontend chart contiguous.
   */
  private fillDaily(
    rows: Array<{
      day: Date;
      tokensIn: bigint | null;
      tokensOut: bigint | null;
      cost: number | null;
    }>,
    startDate: Date,
    endDate: Date
  ): DailyUsagePoint[] {
    const byKey = new Map<string, (typeof rows)[number]>();
    for (const r of rows) {
      byKey.set(toDateKey(r.day), r);
    }

    const result: DailyUsagePoint[] = [];
    const cursor = new Date(
      Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate())
    );
    const endKey = toDateKey(endDate);

    while (toDateKey(cursor) < endKey) {
      const key = toDateKey(cursor);
      const row = byKey.get(key);
      result.push({
        date: key,
        tokensIn: toNumber(row?.tokensIn),
        tokensOut: toNumber(row?.tokensOut),
        cost: roundUsd(toNumber(row?.cost)),
      });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    return result;
  }
}
