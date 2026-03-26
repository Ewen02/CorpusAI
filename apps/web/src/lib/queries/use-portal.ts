import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../api-client';

export interface PortalEndUser {
  id: string;
  email: string;
  name?: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface PortalAI {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  primaryColor: string;
}

export interface PortalConversation {
  id: string;
  title?: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
  ai: {
    id: string;
    name: string;
    slug: string;
    primaryColor: string;
  };
}

export interface PortalMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  createdAt: string;
}

export interface PortalConversationDetail {
  id: string;
  title?: string | null;
  messageCount: number;
  createdAt: string;
  ai: {
    id: string;
    name: string;
    slug: string;
  };
  messages: PortalMessage[];
}

export const portalKeys = {
  all: ['portal'] as const,
  me: () => [...portalKeys.all, 'me'] as const,
  conversations: () => [...portalKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...portalKeys.conversations(), id] as const,
};

export function usePortalMe() {
  return useQuery({
    queryKey: portalKeys.me(),
    queryFn: () => apiClient.get<{ endUser: PortalEndUser; ais: PortalAI[] }>('/portal/me'),
  });
}

export function usePortalConversations() {
  return useQuery({
    queryKey: portalKeys.conversations(),
    queryFn: () => apiClient.get<PortalConversation[]>('/portal/conversations'),
  });
}

export function usePortalConversation(id: string) {
  return useQuery({
    queryKey: portalKeys.conversation(id),
    queryFn: () => apiClient.get<PortalConversationDetail>(`/portal/conversations/${id}`),
    enabled: !!id,
  });
}

export function useSendMagicLink() {
  return useMutation({
    mutationFn: ({ email, aiSlug }: { email: string; aiSlug?: string }) =>
      apiClient.post<{ success: boolean }>('/portal/auth/magic-link', { email, aiSlug }),
  });
}

export function usePortalSignOut() {
  return useMutation({
    mutationFn: () => apiClient.post<{ success: boolean }>('/portal/auth/sign-out'),
  });
}
