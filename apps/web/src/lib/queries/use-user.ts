import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api-client';

export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  username: string | null;
  bio: string | null;
  subscriptionPlan: string;
  subscriptionStatus: string;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  createdAt: string;
  _count?: { ais: number };
}

export const userKeys = {
  all: ['user'] as const,
  profile: () => [...userKeys.all, 'profile'] as const,
};

/**
 * Fetch the authenticated user's profile from /users/me.
 * The API back-fills a username on first read if missing, so this hook
 * also doubles as a "make sure I have a username" entrypoint.
 */
export function useUserProfile() {
  return useQuery({
    queryKey: userKeys.profile(),
    queryFn: () => apiClient.get<UserProfile>('/users/me'),
    staleTime: 5 * 60 * 1000,
  });
}
