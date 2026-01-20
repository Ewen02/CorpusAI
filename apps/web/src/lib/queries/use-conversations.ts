import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";
import type { Conversation, StartConversationResponse } from "./types";

export const conversationKeys = {
  all: ["conversations"] as const,
  lists: () => [...conversationKeys.all, "list"] as const,
  listByAI: (aiId: string) => [...conversationKeys.lists(), { aiId }] as const,
  details: () => [...conversationKeys.all, "detail"] as const,
  detail: (id: string) => [...conversationKeys.details(), id] as const,
};

export function useConversations(aiId: string) {
  return useQuery({
    queryKey: conversationKeys.listByAI(aiId),
    queryFn: () => apiClient.get<Conversation[]>(`/ais/${aiId}/conversations`),
    enabled: !!aiId,
  });
}

export function useConversation(id: string) {
  return useQuery({
    queryKey: conversationKeys.detail(id),
    queryFn: () => apiClient.get<Conversation>(`/chat/conversations/${id}`),
    enabled: !!id,
  });
}

export function useStartConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (aiSlug: string) =>
      apiClient.post<StartConversationResponse>(`/chat/${aiSlug}/start`),
    onSuccess: (_, aiSlug) => {
      // We need the aiId to invalidate, but we can invalidate all lists
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/chat/conversations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });
}
