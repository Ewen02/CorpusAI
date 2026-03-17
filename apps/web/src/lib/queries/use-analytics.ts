import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';

export interface DailyDataPoint {
  date: string;
  documents: number;
  conversations: number;
  questions: number;
}

export interface Trend {
  value: number;
  isPositive: boolean;
}

export interface AnalyticsData {
  daily: DailyDataPoint[];
  totals: {
    documents: number;
    conversations: number;
    questions: number;
  };
  trends: {
    documents: Trend;
    conversations: Trend;
    questions: Trend;
  };
}

export type AnalyticsPeriod = '7d' | '30d' | '90d';

export const analyticsKeys = {
  all: ['analytics'] as const,
  period: (period: AnalyticsPeriod) => [...analyticsKeys.all, period] as const,
};

export function useAnalytics(period: AnalyticsPeriod = '30d') {
  return useQuery({
    queryKey: analyticsKeys.period(period),
    queryFn: () => apiClient.get<AnalyticsData>(`/users/me/analytics?period=${period}`),
    staleTime: 30 * 60 * 1000, // 30 min — analytics data changes slowly
  });
}
