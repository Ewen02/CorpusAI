import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../api-client";
import type { Document } from "./types";

export const documentKeys = {
  all: ["documents"] as const,
  lists: () => [...documentKeys.all, "list"] as const,
  listByAI: (aiId: string) => [...documentKeys.lists(), { aiId }] as const,
  details: () => [...documentKeys.all, "detail"] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
};

export function useDocuments(aiId: string) {
  return useQuery({
    queryKey: documentKeys.listByAI(aiId),
    queryFn: () => apiClient.get<Document[]>(`/ais/${aiId}/documents`),
    enabled: !!aiId,
  });
}

export function useDocument(aiId: string, id: string) {
  return useQuery({
    queryKey: documentKeys.detail(id),
    queryFn: () => apiClient.get<Document>(`/ais/${aiId}/documents/${id}`),
    enabled: !!aiId && !!id,
  });
}

interface CreateDocumentInput {
  aiId: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
}

export function useCreateDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ aiId, ...data }: CreateDocumentInput) =>
      apiClient.post<Document>(`/ais/${aiId}/documents`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentKeys.listByAI(variables.aiId),
      });
    },
  });
}

interface CreateTextDocumentInput {
  aiId: string;
  filename: string;
  content: string;
}

export function useCreateTextDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ aiId, ...data }: CreateTextDocumentInput) =>
      apiClient.post<Document>(`/ais/${aiId}/documents/text`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentKeys.listByAI(variables.aiId),
      });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ aiId, id }: { aiId: string; id: string }) =>
      apiClient.delete(`/ais/${aiId}/documents/${id}`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentKeys.listByAI(variables.aiId),
      });
    },
  });
}

export function useRetryDocument() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ aiId, id }: { aiId: string; id: string }) =>
      apiClient.post<Document>(`/ais/${aiId}/documents/${id}/retry`),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentKeys.listByAI(variables.aiId),
      });
      queryClient.invalidateQueries({
        queryKey: documentKeys.detail(variables.id),
      });
    },
  });
}
