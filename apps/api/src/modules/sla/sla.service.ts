import { Injectable } from '@nestjs/common';
import { SLARepository } from './sla.repository';

export interface SLAReport {
  window: '24h' | '7d' | '30d';
  windowStart: string;
  windowEnd: string;
  /** Service-level indicators */
  sli: {
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    /** Successful answers / total answers. 1.0 means no LOW-confidence replies. */
    successRate: number;
  };
  /** Whether the SLI clears the target SLO. */
  slo: {
    p95Target: number;
    p95Met: boolean;
    successRateTarget: number;
    successRateMet: boolean;
  };
  totals: {
    messages: number;
    errors: number;
  };
}

const WINDOW_MS: Record<SLAReport['window'], number> = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

const P95_TARGET_MS = 3000;
const SUCCESS_RATE_TARGET = 0.95;

@Injectable()
export class SLAService {
  constructor(private readonly repo: SLARepository) {}

  async getReport(window: SLAReport['window'] = '24h'): Promise<SLAReport> {
    const now = new Date();
    const since = new Date(now.getTime() - WINDOW_MS[window]);

    const agg = await this.repo.getLatencyAggregate(since);

    const successRate =
      agg.totalMessages > 0 ? (agg.totalMessages - agg.errorCount) / agg.totalMessages : 1;

    return {
      window,
      windowStart: since.toISOString(),
      windowEnd: now.toISOString(),
      sli: {
        p50LatencyMs: Math.round(agg.p50),
        p95LatencyMs: Math.round(agg.p95),
        p99LatencyMs: Math.round(agg.p99),
        successRate: Math.round(successRate * 10000) / 10000,
      },
      slo: {
        p95Target: P95_TARGET_MS,
        p95Met: agg.p95 <= P95_TARGET_MS,
        successRateTarget: SUCCESS_RATE_TARGET,
        successRateMet: successRate >= SUCCESS_RATE_TARGET,
      },
      totals: {
        messages: agg.totalMessages,
        errors: agg.errorCount,
      },
    };
  }
}
