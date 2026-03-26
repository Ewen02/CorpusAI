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
    documents: Trend | null;
    conversations: Trend | null;
    questions: Trend | null;
  };
}

export interface AIAnalyticsData extends AnalyticsData {
  satisfaction: {
    rate: number | null;
    high: number;
    medium: number;
    low: number;
    total: number;
  };
  engagement: {
    avgMessagesPerConversation: number;
    uniqueUsers: number;
  };
  knowledgeBase: {
    documentCount: number;
    totalWords: number;
    totalPages: number;
    totalChunks: number;
  };
  unanswered: {
    count: number;
    rate: number | null;
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

export function useAIAnalytics(aiId: string, period: AnalyticsPeriod = '30d') {
  return useQuery({
    queryKey: [...analyticsKeys.period(period), 'ai', aiId],
    queryFn: () => apiClient.get<AIAnalyticsData>(`/ais/${aiId}/analytics?period=${period}`),
    enabled: !!aiId,
    staleTime: 5 * 60 * 1000,
  });
}
