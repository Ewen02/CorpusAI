import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../api-client";

export interface DashboardStats {
  aiCount: number;
  documentCount: number;
  conversationCount: number;
  questionCount: number;
  subscriptionPlan: string;
}

export const dashboardKeys = {
  all: ["dashboard"] as const,
  stats: () => [...dashboardKeys.all, "stats"] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats(),
    queryFn: () => apiClient.get<DashboardStats>("/users/me/stats"),
  });
}
