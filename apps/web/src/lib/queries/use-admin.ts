import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';

// Types
export interface AdminTopAI {
  id: string;
  name: string;
  slug: string;
  conversationCount: number;
  questionCount: number;
  documentCount: number;
  user: { email: string; name: string | null };
}

export interface AdminDashboard {
  totals: {
    users: number;
    ais: number;
    documents: number;
    conversations: number;
    messages: number;
  };
  usersByPlan: Array<{ plan: string; count: number }>;
  documentsByStatus: Array<{ status: string; count: number }>;
  recentSignups: number;
  topAIs: AdminTopAI[];
  failedDocsRate: number;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  image: string | null;
  role: string;
  subscriptionPlan: string;
  subscriptionStatus: string;
  createdAt: string;
  _count: { ais: number; dailyStats: number };
  sessions: Array<{ updatedAt: string }>;
}

export interface AdminAI {
  id: string;
  name: string;
  slug: string;
  status: string;
  isPublic: boolean;
  accessType: string;
  documentCount: number;
  conversationCount: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; name: string | null };
}

interface PaginatedResponse<T> {
  users?: T[];
  ais?: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface FailedJob {
  jobId: string;
  documentId: string;
  aiId: string;
  filename: string;
  error: string;
  attemptsMade: number;
  failedAt: string | null;
  createdAt: string;
}

interface FailedJobsResponse {
  total: number;
  jobs: FailedJob[];
}

// Keys
export const adminKeys = {
  all: ['admin'] as const,
  dashboard: () => [...adminKeys.all, 'dashboard'] as const,
  users: (page: number, search?: string) => [...adminKeys.all, 'users', page, search] as const,
  ais: (page: number, search?: string) => [...adminKeys.all, 'ais', page, search] as const,
  health: () => [...adminKeys.all, 'health'] as const,
  failedJobs: () => [...adminKeys.all, 'failed-jobs'] as const,
};

// Hooks
export function useAdminDashboard() {
  return useQuery({
    queryKey: adminKeys.dashboard(),
    queryFn: () => apiClient.get<AdminDashboard>('/admin/dashboard'),
  });
}

export function useAdminUsers(page = 1, search?: string) {
  return useQuery({
    queryKey: adminKeys.users(page, search),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set('search', search);
      return apiClient.get<PaginatedResponse<AdminUser>>(`/admin/users?${params}`);
    },
  });
}

export function useAdminAIs(page = 1, search?: string) {
  return useQuery({
    queryKey: adminKeys.ais(page, search),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set('search', search);
      return apiClient.get<PaginatedResponse<AdminAI>>(`/admin/ais?${params}`);
    },
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      apiClient.patch(`/admin/users/${userId}/role`, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useUpdateUserPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, plan }: { userId: string; plan: string }) =>
      apiClient.patch(`/admin/users/${userId}/plan`, { plan }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.all });
    },
  });
}

export function useFailedJobs() {
  return useQuery({
    queryKey: adminKeys.failedJobs(),
    queryFn: () => apiClient.get<FailedJobsResponse>('/admin/failed-jobs'),
    refetchInterval: 30_000,
  });
}

export function useRetryFailedJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => apiClient.post(`/admin/failed-jobs/${jobId}/retry`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.failedJobs() });
    },
  });
}

export function useDiscardFailedJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => apiClient.delete(`/admin/failed-jobs/${jobId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.failedJobs() });
    },
  });
}
