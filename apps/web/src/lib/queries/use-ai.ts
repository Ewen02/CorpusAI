import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import { track } from '../analytics';
import type { AI } from './types';

export const aiKeys = {
  all: ['ais'] as const,
  lists: () => [...aiKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...aiKeys.lists(), filters] as const,
  details: () => [...aiKeys.all, 'detail'] as const,
  detail: (id: string) => [...aiKeys.details(), id] as const,
  bySlug: (slug: string) => [...aiKeys.all, 'slug', slug] as const,
};

export function useAIs() {
  return useQuery({
    queryKey: aiKeys.lists(),
    queryFn: () => apiClient.get<AI[]>('/ais'),
    staleTime: 5 * 60 * 1000, // 5 min — AI list rarely changes
  });
}

export function useAI(id: string) {
  return useQuery({
    queryKey: aiKeys.detail(id),
    queryFn: () => apiClient.get<AI>(`/ais/${id}`),
    enabled: !!id,
  });
}

export function useAIBySlug(slug: string) {
  return useQuery({
    queryKey: aiKeys.bySlug(slug),
    queryFn: () => apiClient.get<AI>(`/ais/slug/${slug}`),
    enabled: !!slug,
  });
}

interface CreateAIInput {
  name: string;
  description?: string;
  systemPrompt?: string;
  welcomeMessage?: string;
  primaryColor?: string;
  temperature?: number;
  maxTokens?: number;
  scoreThreshold?: number;
  isPublic?: boolean;
  language?: 'fr' | 'en';
}

interface UpdateAIData extends Partial<CreateAIInput> {
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  category?: 'SUPPORT' | 'EDUCATION' | 'LEGAL' | 'FINANCE' | 'HEALTH' | 'TECH' | 'OTHER';
  scoreThreshold?: number;
  llmModel?: string;
  llmProvider?: 'openai' | 'anthropic' | 'groq';
  memoryEnabled?: boolean;
}

export function useCreateAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAIInput) => apiClient.post<AI>('/ais', input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: aiKeys.lists() });
      track('ai_created', {
        category: (data as AI & { category?: string }).category ?? 'OTHER',
        hasTemplate: false,
      });
    },
  });
}

interface UpdateAIInput {
  id: string;
  data: UpdateAIData;
}

interface UpdateAIContext {
  previousDetail: AI | undefined;
  previousLists: Array<[readonly unknown[], AI[] | undefined]>;
}

export function useUpdateAI() {
  const queryClient = useQueryClient();

  return useMutation<AI, Error, UpdateAIInput, UpdateAIContext>({
    mutationFn: ({ id, data }: UpdateAIInput) => apiClient.patch<AI>(`/ais/${id}`, data),
    onMutate: async ({ id, data }) => {
      // Cancel in-flight queries so they don't overwrite our optimistic update
      await Promise.all([
        queryClient.cancelQueries({ queryKey: aiKeys.detail(id) }),
        queryClient.cancelQueries({ queryKey: aiKeys.lists() }),
      ]);

      // Snapshot detail
      const previousDetail = queryClient.getQueryData<AI>(aiKeys.detail(id));

      // Snapshot every cached list (different filters → different keys)
      const previousLists = queryClient.getQueriesData<AI[]>({ queryKey: aiKeys.lists() });

      // Optimistically patch detail
      if (previousDetail) {
        queryClient.setQueryData<AI>(aiKeys.detail(id), {
          ...previousDetail,
          ...data,
        });
      }

      // Optimistically patch every list cache that contains this AI
      previousLists.forEach(([key, list]) => {
        if (!list) return;
        queryClient.setQueryData<AI[]>(
          key,
          list.map((ai) => (ai.id === id ? { ...ai, ...data } : ai))
        );
      });

      return { previousDetail, previousLists };
    },
    onError: (_err, { id }, context) => {
      // Rollback detail
      if (context?.previousDetail) {
        queryClient.setQueryData(aiKeys.detail(id), context.previousDetail);
      }
      // Rollback every list snapshot
      context?.previousLists.forEach(([key, list]) => {
        queryClient.setQueryData(key, list);
      });
    },
    onSettled: (_data, _error, { id }) => {
      // Final sync with server (handles server-side derived fields)
      queryClient.invalidateQueries({ queryKey: aiKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: aiKeys.lists() });
    },
  });
}

interface DeleteAIContext {
  previousLists: Array<[readonly unknown[], AI[] | undefined]>;
}

export function useDeleteAI() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, string, DeleteAIContext>({
    mutationFn: (id: string) => apiClient.delete(`/ais/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: aiKeys.lists() });

      const previousLists = queryClient.getQueriesData<AI[]>({ queryKey: aiKeys.lists() });

      // Optimistically remove the AI from every list cache
      previousLists.forEach(([key, list]) => {
        if (!list) return;
        queryClient.setQueryData<AI[]>(
          key,
          list.filter((ai) => ai.id !== id)
        );
      });

      return { previousLists };
    },
    onError: (_err, _id, context) => {
      context?.previousLists.forEach(([key, list]) => {
        queryClient.setQueryData(key, list);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: aiKeys.lists() });
    },
  });
}

export interface AISuggestions {
  description: string;
  systemPrompt: string;
  welcomeMessage: string;
}

export function useGenerateSuggestions() {
  return useMutation({
    mutationFn: (aiId: string) =>
      apiClient.post<AISuggestions>(`/ais/${aiId}/generate-suggestions`),
  });
}
