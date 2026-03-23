import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';

// ─── Types (mirrored from eval-reports.service.ts) ────────────────────────────

export interface EvalMetrics {
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_recall: number | null;
}

export interface EvalSummary {
  faithfulness: number | null;
  answer_relevancy: number | null;
  context_recall: number | null;
  avgLatencyMs: number;
  validCounts: {
    faithfulness: number;
    answer_relevancy: number;
    context_recall: number;
    total: number;
  };
}

export interface EvalResult {
  question: string;
  document_id: string;
  answer: string;
  sources: { documentSource: string; score: number; text: string }[];
  metrics: EvalMetrics;
  latencyMs: number;
  error?: string;
  metricError?: boolean;
}

export interface EvalReport {
  runId: string;
  aiSlug: string;
  config: { apiUrl: string; model: string };
  summary: EvalSummary;
  results: EvalResult[];
}

export interface EvalReportSummary {
  runId: string;
  aiSlug: string;
  summary: EvalSummary;
  resultsCount: number;
  createdAt: string;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const evalKeys = {
  all: ['eval'] as const,
  reports: (slug?: string) => [...evalKeys.all, 'reports', slug] as const,
  report: (runId: string) => [...evalKeys.all, 'report', runId] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useEvalReports(slug?: string) {
  return useQuery({
    queryKey: evalKeys.reports(slug),
    queryFn: () => {
      const params = slug ? `?slug=${encodeURIComponent(slug)}` : '';
      return apiClient.get<EvalReportSummary[]>(`/admin/eval/reports${params}`);
    },
    staleTime: 30 * 1000,
  });
}

export function useEvalReport(runId: string) {
  return useQuery({
    queryKey: evalKeys.report(runId),
    queryFn: () => apiClient.get<EvalReport>(`/admin/eval/reports/${encodeURIComponent(runId)}`),
    enabled: !!runId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useEvalDatasets() {
  return useQuery({
    queryKey: [...evalKeys.all, 'datasets'],
    queryFn: () => apiClient.get<string[]>('/admin/eval/datasets'),
    staleTime: 60_000,
  });
}

export function useRunEval() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ slug, dataset }: { slug: string; dataset: string }) =>
      apiClient.post<{ runId: string }>('/admin/eval/run', { slug, dataset }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: evalKeys.all });
    },
  });
}
