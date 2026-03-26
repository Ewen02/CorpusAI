import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';

export interface AIAccessGrant {
  id: string;
  aiId: string;
  endUserId: string;
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  expiresAt?: string | null;
  createdAt: string;
  endUser: {
    id: string;
    email: string;
    name?: string | null;
    emailVerified: boolean;
    createdAt: string;
  };
}

export const aiAccessKeys = {
  members: (aiId: string) => ['ais', aiId, 'members'] as const,
};

export function useAIMembers(aiId: string) {
  return useQuery({
    queryKey: aiAccessKeys.members(aiId),
    queryFn: () => apiClient.get<AIAccessGrant[]>(`/ais/${aiId}/members`),
    enabled: !!aiId,
  });
}

export function useGenerateAccessToken(aiId: string) {
  return useMutation({
    mutationFn: () => apiClient.post<{ token: string; url: string }>(`/ais/${aiId}/access/token`),
  });
}

export function useDeleteAccessToken(aiId: string) {
  return useMutation({
    mutationFn: () => apiClient.delete<{ success: boolean }>(`/ais/${aiId}/access/token`),
  });
}

export function useSetAccessCode(aiId: string) {
  return useMutation({
    mutationFn: (code: string) =>
      apiClient.post<{ success: boolean }>(`/ais/${aiId}/access/code`, { code }),
  });
}

export function useDeleteAccessCode(aiId: string) {
  return useMutation({
    mutationFn: () => apiClient.delete<{ success: boolean }>(`/ais/${aiId}/access/code`),
  });
}

export function useUpdateInviteOnly(aiId: string) {
  return useMutation({
    mutationFn: (inviteOnly: boolean) =>
      apiClient.patch<{ success: boolean }>(`/ais/${aiId}/access/invite`, { inviteOnly }),
  });
}

export function useInviteMember(aiId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, name }: { email: string; name?: string }) =>
      apiClient.post<{ success: boolean; endUserId: string }>(`/ais/${aiId}/members`, {
        email,
        name,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiAccessKeys.members(aiId) });
    },
  });
}

export function useRevokeMember(aiId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (endUserId: string) =>
      apiClient.delete<{ success: boolean }>(`/ais/${aiId}/members/${endUserId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: aiAccessKeys.members(aiId) });
    },
  });
}
