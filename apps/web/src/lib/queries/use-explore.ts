import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';
import type { AICategory } from '@corpusai/types';

// ============================================
// Types
// ============================================

export interface ExploreCreator {
  id: string;
  name: string | null;
  username: string | null;
  image: string | null;
}

export interface ExploreAICard {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  primaryColor: string;
  logo: string | null;
  category: AICategory;
  conversationCount: number;
  createdAt: string;
  user: ExploreCreator;
}

export interface ExploreMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ExploreAIsResponse {
  data: ExploreAICard[];
  meta: ExploreMeta;
}

export interface CreatorProfile {
  id: string;
  name: string | null;
  username: string;
  bio: string | null;
  image: string | null;
  createdAt: string;
  ais: ExploreAICard[];
}

export interface ExploreParams {
  search?: string;
  category?: AICategory;
  sort?: 'newest' | 'popular';
  page?: number;
  limit?: number;
}

// ============================================
// Query keys
// ============================================

export const exploreKeys = {
  all: ['explore'] as const,
  ais: (params: ExploreParams) => [...exploreKeys.all, 'ais', params] as const,
  featured: () => [...exploreKeys.all, 'featured'] as const,
  creator: (username: string) => [...exploreKeys.all, 'creator', username] as const,
};

// ============================================
// Hooks
// ============================================

export function useExploreAIs(params: ExploreParams = {}) {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set('search', params.search);
  if (params.category) searchParams.set('category', params.category);
  if (params.sort) searchParams.set('sort', params.sort);
  if (params.page) searchParams.set('page', String(params.page));
  if (params.limit) searchParams.set('limit', String(params.limit));

  const query = searchParams.toString();

  return useQuery({
    queryKey: exploreKeys.ais(params),
    queryFn: () => apiClient.get<ExploreAIsResponse>(`/explore/ais${query ? `?${query}` : ''}`),
    staleTime: 2 * 60 * 1000,
  });
}

export function useFeaturedAIs() {
  return useQuery({
    queryKey: exploreKeys.featured(),
    queryFn: () => apiClient.get<ExploreAICard[]>('/explore/ais/featured'),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreatorProfile(username: string) {
  return useQuery({
    queryKey: exploreKeys.creator(username),
    queryFn: () => apiClient.get<CreatorProfile>(`/explore/creators/${username}`),
    enabled: !!username,
    staleTime: 2 * 60 * 1000,
  });
}
