import { BadRequestException, Injectable } from '@nestjs/common';
import type { ConfidenceLevel } from '@corpusai/database';
import { OwnershipService } from '../../shared';
import {
  AnalyticsRepository,
  type FlaggedMessageRow,
  type UserQuestionRow,
} from './analytics.repository';

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

/** Maximum failing answers returned in a quality report. */
const MAX_FAILING_ANSWERS = 20;
/** Maximum coverage gaps returned in a quality report. */
const MAX_COVERAGE_GAPS = 10;
/** Failing answer excerpts are truncated to this many characters. */
const ANSWER_EXCERPT_LENGTH = 300;
/**
 * Hard cap on flagged messages analysed per report. Bounds memory and keeps
 * the in-memory question pairing predictable; failing answers are the 20 most
 * recent, coverage gaps are computed over (at most) this window of messages.
 */
const MAX_FLAGGED_MESSAGES = 500;

/** Reporting window echoed back to the caller. */
export interface QualityReportPeriod {
  from: string;
  to: string;
  days: number;
}

/** Period-wide quality counters and derived rates. */
export interface QualityReportTotals {
  assistantMessages: number;
  negativeFeedback: number;
  positiveFeedback: number;
  lowConfidence: number;
  /** (positive + negative) / assistantMessages — 0 when no messages. */
  feedbackRate: number;
  /** negative / (positive + negative) — 0 when no feedback at all. */
  negativeRate: number;
}

/** One failing assistant answer (negative feedback OR low confidence). */
export interface FailingAnswer {
  messageId: string;
  conversationId: string;
  createdAt: string;
  /** Last USER message preceding this answer in the same conversation. */
  question: string | null;
  answerExcerpt: string;
  feedback: 'negative' | null;
  confidence: ConfidenceLevel | null;
  sourcesCount: number;
}

/** A recurring question that produced low-confidence answers. */
export interface CoverageGap {
  question: string;
  occurrences: number;
}

/** Full response payload for `GET /analytics/ais/:aiId/quality-report`. */
export interface QualityReport {
  period: QualityReportPeriod;
  totals: QualityReportTotals;
  failingAnswers: FailingAnswer[];
  coverageGaps: CoverageGap[];
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

/** Rounds a 0..1 ratio to 4 decimal places (stable JSON payloads). */
function roundRate(value: number): number {
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
   * Builds the RAG quality report for a single AI: period-wide counters,
   * the most recent failing answers (negative feedback OR low confidence),
   * and recurring low-confidence questions (coverage gaps).
   *
   * Contract:
   *  - Ownership of `aiId` is verified first; unknown/foreign AI → 404.
   *  - Rates are 0 when their denominator is 0 (never NaN).
   *  - Exactly two message queries: flagged assistant messages + the USER
   *    messages of the involved conversations, paired in memory.
   */
  async getQualityReport(
    userId: string,
    aiId: string,
    params: { days: number }
  ): Promise<QualityReport> {
    await this.ownership.verifyAIOwnership(aiId, userId);

    const to = new Date();
    const from = new Date(to.getTime() - params.days * DAY_MS);

    const [totalsRow, flagged] = await Promise.all([
      this.repo.getQualityTotals(aiId, from, to),
      this.repo.findFlaggedAssistantMessages(aiId, from, to, MAX_FLAGGED_MESSAGES),
    ]);

    const conversationIds = [...new Set(flagged.map((m) => m.conversationId))];
    const userMessages = await this.repo.findUserMessagesForConversations(conversationIds, to);
    const questionsByConversation = this.indexQuestions(userMessages);

    const assistantMessages = toNumber(totalsRow.assistantMessages);
    const negativeFeedback = toNumber(totalsRow.negativeFeedback);
    const positiveFeedback = toNumber(totalsRow.positiveFeedback);
    const lowConfidence = toNumber(totalsRow.lowConfidence);
    const feedbackTotal = positiveFeedback + negativeFeedback;

    return {
      period: { from: from.toISOString(), to: to.toISOString(), days: params.days },
      totals: {
        assistantMessages,
        negativeFeedback,
        positiveFeedback,
        lowConfidence,
        feedbackRate: assistantMessages > 0 ? roundRate(feedbackTotal / assistantMessages) : 0,
        negativeRate: feedbackTotal > 0 ? roundRate(negativeFeedback / feedbackTotal) : 0,
      },
      failingAnswers: flagged
        .slice(0, MAX_FAILING_ANSWERS)
        .map((m) => this.toFailingAnswer(m, questionsByConversation)),
      coverageGaps: this.buildCoverageGaps(flagged, questionsByConversation),
    };
  }

  /** Groups USER messages by conversation (kept sorted oldest → newest). */
  private indexQuestions(userMessages: UserQuestionRow[]): Map<string, UserQuestionRow[]> {
    const byConversation = new Map<string, UserQuestionRow[]>();
    for (const message of userMessages) {
      const list = byConversation.get(message.conversationId);
      if (list) {
        list.push(message);
      } else {
        byConversation.set(message.conversationId, [message]);
      }
    }
    return byConversation;
  }

  /**
   * Returns the most recent USER message of the conversation created strictly
   * before `before` — i.e. the question that triggered the assistant answer.
   */
  private findQuestionBefore(
    questionsByConversation: Map<string, UserQuestionRow[]>,
    conversationId: string,
    before: Date
  ): string | null {
    const questions = questionsByConversation.get(conversationId);
    if (!questions) return null;
    for (let i = questions.length - 1; i >= 0; i--) {
      const candidate = questions[i];
      if (candidate && candidate.createdAt.getTime() < before.getTime()) {
        return candidate.content;
      }
    }
    return null;
  }

  private toFailingAnswer(
    message: FlaggedMessageRow,
    questionsByConversation: Map<string, UserQuestionRow[]>
  ): FailingAnswer {
    return {
      messageId: message.id,
      conversationId: message.conversationId,
      createdAt: message.createdAt.toISOString(),
      question: this.findQuestionBefore(
        questionsByConversation,
        message.conversationId,
        message.createdAt
      ),
      answerExcerpt: message.content.slice(0, ANSWER_EXCERPT_LENGTH),
      feedback: message.feedback === 'negative' ? 'negative' : null,
      confidence: message.confidence,
      sourcesCount: Array.isArray(message.sources) ? message.sources.length : 0,
    };
  }

  /**
   * Groups the questions behind low-confidence answers (normalisation:
   * lowercase + trim) and returns the top {@link MAX_COVERAGE_GAPS} by
   * occurrences. The displayed question is the first variant encountered
   * (most recent, since flagged messages arrive newest first).
   */
  private buildCoverageGaps(
    flagged: FlaggedMessageRow[],
    questionsByConversation: Map<string, UserQuestionRow[]>
  ): CoverageGap[] {
    const gaps = new Map<string, CoverageGap>();
    for (const message of flagged) {
      if (message.confidence !== 'LOW') continue;
      const question = this.findQuestionBefore(
        questionsByConversation,
        message.conversationId,
        message.createdAt
      );
      if (!question) continue;
      const key = question.trim().toLowerCase();
      if (!key) continue;
      const existing = gaps.get(key);
      if (existing) {
        existing.occurrences += 1;
      } else {
        gaps.set(key, { question: question.trim(), occurrences: 1 });
      }
    }
    return [...gaps.values()]
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, MAX_COVERAGE_GAPS);
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
