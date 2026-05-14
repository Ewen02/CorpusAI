import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';

/**
 * Per-day cost breakdown point. `cost` is in USD with 4-decimal precision.
 */
export interface UsageDailyPoint {
  date: string;
  tokensIn: number;
  tokensOut: number;
  cost: number;
}

/** Per-model usage rollup over the requested window. */
export interface UsageModelPoint {
  model: string;
  tokens: number;
  cost: number;
}

/** Full response shape of `GET /analytics/usage`. */
export interface UsageStats {
  totalTokensIn: number;
  totalTokensOut: number;
  totalCostUsd: number;
  daily: UsageDailyPoint[];
  byModel: UsageModelPoint[];
}

export interface UseUsageStatsParams {
  /** Restrict the breakdown to a single AI. Omit for the user-wide breakdown. */
  aiId?: string;
  /** ISO-8601 start. Defaults to 30 days ago server-side. */
  startDate?: string;
  /** ISO-8601 end. Defaults to now server-side. */
  endDate?: string;
}

export const usageStatsKeys = {
  all: ['usage-stats'] as const,
  list: (params: UseUsageStatsParams) =>
    [
      ...usageStatsKeys.all,
      params.aiId ?? null,
      params.startDate ?? null,
      params.endDate ?? null,
    ] as const,
};

/**
 * Builds the querystring for `/analytics/usage`. Omitted params are stripped.
 */
function buildQuery(params: UseUsageStatsParams): string {
  const search = new URLSearchParams();
  if (params.aiId) search.set('aiId', params.aiId);
  if (params.startDate) search.set('startDate', params.startDate);
  if (params.endDate) search.set('endDate', params.endDate);
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export function useUsageStats(params: UseUsageStatsParams = {}) {
  return useQuery({
    queryKey: usageStatsKeys.list(params),
    queryFn: () => apiClient.get<UsageStats>(`/analytics/usage${buildQuery(params)}`),
    // Cost data only changes when new messages are persisted — a 5-min cache
    // dramatically reduces dashboard query churn while staying fresh enough.
    staleTime: 5 * 60 * 1000,
  });
}
