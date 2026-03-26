import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';
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
}

export function useCreateAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateAIInput) => apiClient.post<AI>('/ais', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiKeys.lists() });
    },
  });
}

interface UpdateAIInput {
  id: string;
  data: UpdateAIData;
}

export function useUpdateAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateAIInput) => apiClient.patch<AI>(`/ais/${id}`, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: aiKeys.detail(data.id) });
      queryClient.invalidateQueries({ queryKey: aiKeys.lists() });
    },
  });
}

export function useDeleteAI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/ais/${id}`),
    onSuccess: () => {
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
