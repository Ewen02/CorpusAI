import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';

// Response shapes for the admin monitoring endpoints.
export interface ServiceStatus {
  status: string;
  latencyMs: number;
  error?: string;
  collections?: number;
  totalPoints?: number;
}

export interface HealthData {
  status: 'healthy' | 'degraded';
  uptime: number;
  timestamp: string;
  responseMs: number;
  services: {
    postgres: ServiceStatus;
    qdrant: ServiceStatus;
    redis: ServiceStatus;
    openai: ServiceStatus;
  };
  documentQueue: {
    failed: number;
    pending: number;
    processing: number;
  };
}

export interface TestSuite {
  name: string;
  status: 'passed' | 'failed' | 'error';
  tests: number;
  passed: number;
  failed: number;
  files: number;
  error?: string;
}

export interface TestStatus {
  status: 'all_passed' | 'some_failed';
  totalTests: number;
  totalPassed: number;
  totalFailed: number;
  suites: TestSuite[];
  timestamp: string;
}

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
  user: { id: string; email: string; name: string | null; username: string | null };
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
  tests: () => [...adminKeys.all, 'tests'] as const,
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

/** System health, auto-refreshed on an interval while the tab is visible. */
export function useAdminHealth() {
  return useQuery({
    queryKey: adminKeys.health(),
    queryFn: () => apiClient.get<HealthData>('/admin/health'),
    refetchInterval: 30_000,
  });
}

/**
 * On-demand test-suite run — disabled by default because it is expensive.
 * Trigger it explicitly via the returned `refetch`.
 */
export function useAdminTests() {
  return useQuery({
    queryKey: adminKeys.tests(),
    queryFn: () => apiClient.get<TestStatus>('/admin/tests'),
    enabled: false,
    staleTime: Infinity,
    gcTime: Infinity,
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
