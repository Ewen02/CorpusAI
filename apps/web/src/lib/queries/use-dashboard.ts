import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';

export interface DashboardStats {
  aiCount: number;
  documentCount: number;
  conversationCount: number;
  questionCount: number;
  subscriptionPlan: string;
}

export const dashboardKeys = {
  all: ['dashboard'] as const,
  stats: () => [...dashboardKeys.all, 'stats'] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => apiClient.get<DashboardStats>('/users/me/stats'),
  });
}

export interface UsageLimitItem {
  used: number;
  max: number; // -1 = unlimited
}

export interface UsageData {
  plan: string;
  status: string;
  expiresAt: string | null;
  limits: {
    ais: UsageLimitItem;
    questionsPerDay: UsageLimitItem;
  };
  remaining: {
    ais: number | 'unlimited';
    questionsPerDay: number | 'unlimited';
  };
}

export const usageKeys = {
  all: ['usage'] as const,
};

export function useUsage() {
  return useQuery({
    queryKey: usageKeys.all,
    queryFn: () => apiClient.get<UsageData>('/users/me/usage'),
  });
}
