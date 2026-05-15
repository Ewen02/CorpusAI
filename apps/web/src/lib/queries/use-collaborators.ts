import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';

export type CollaboratorRole = 'EDITOR' | 'VIEWER';

export interface Collaborator {
  id: string;
  aiId: string;
  userId: string | null;
  email: string;
  role: CollaboratorRole;
  invitedBy: string;
  invitedAt: string;
  acceptedAt: string | null;
  expiresAt: string | null;
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  } | null;
  inviter: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface InviteCollaboratorResponse {
  id: string;
  email: string;
  role: CollaboratorRole;
  inviteUrl: string;
}

export interface AcceptInviteResponse {
  aiId: string;
  aiSlug: string;
  role: CollaboratorRole;
}

export const collaboratorKeys = {
  all: ['collaborators'] as const,
  list: (aiId: string) => [...collaboratorKeys.all, 'list', aiId] as const,
};

export function useCollaborators(aiId: string) {
  return useQuery({
    queryKey: collaboratorKeys.list(aiId),
    queryFn: () => apiClient.get<Collaborator[]>(`/ais/${aiId}/collaborators`),
    enabled: !!aiId,
  });
}

export function useInviteCollaborator(aiId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; role: CollaboratorRole }) =>
      apiClient.post<InviteCollaboratorResponse>(`/ais/${aiId}/collaborators`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: collaboratorKeys.list(aiId) });
    },
  });
}

interface UpdateCollaboratorVariables {
  id: string;
  role: CollaboratorRole;
}

interface CollaboratorListContext {
  previousList: Collaborator[] | undefined;
}

export function useUpdateCollaborator(aiId: string) {
  const queryClient = useQueryClient();
  return useMutation<Collaborator, Error, UpdateCollaboratorVariables, CollaboratorListContext>({
    mutationFn: ({ id, role }) =>
      apiClient.patch<Collaborator>(`/ais/${aiId}/collaborators/${id}`, { role }),
    onMutate: async ({ id, role }) => {
      await queryClient.cancelQueries({ queryKey: collaboratorKeys.list(aiId) });

      const previousList = queryClient.getQueryData<Collaborator[]>(collaboratorKeys.list(aiId));

      if (previousList) {
        queryClient.setQueryData<Collaborator[]>(
          collaboratorKeys.list(aiId),
          previousList.map((c) => (c.id === id ? { ...c, role } : c))
        );
      }

      return { previousList };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(collaboratorKeys.list(aiId), context.previousList);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: collaboratorKeys.list(aiId) });
    },
  });
}

export function useRevokeCollaborator(aiId: string) {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string, CollaboratorListContext>({
    mutationFn: (id: string) =>
      apiClient.delete<{ success: boolean }>(`/ais/${aiId}/collaborators/${id}`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: collaboratorKeys.list(aiId) });

      const previousList = queryClient.getQueryData<Collaborator[]>(collaboratorKeys.list(aiId));

      if (previousList) {
        queryClient.setQueryData<Collaborator[]>(
          collaboratorKeys.list(aiId),
          previousList.filter((c) => c.id !== id)
        );
      }

      return { previousList };
    },
    onError: (_err, _id, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(collaboratorKeys.list(aiId), context.previousList);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: collaboratorKeys.list(aiId) });
    },
  });
}

export function useAcceptCollaboratorInvite() {
  return useMutation({
    mutationFn: (token: string) =>
      apiClient.post<AcceptInviteResponse>(`/collaborators/invites/${token}/accept`),
  });
}
