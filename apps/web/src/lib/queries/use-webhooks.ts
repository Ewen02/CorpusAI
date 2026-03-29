import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api-client';

// Types

export interface WebhookDelivery {
  id: string;
  eventType: string;
  statusCode: number | null;
  success: boolean;
  createdAt: string;
}

export interface WebhookInfo {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  lastDeliveredAt: string | null;
  failureCount: number;
  deliveries: WebhookDelivery[];
}

export interface NewWebhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
}

// Keys

export const webhookKeys = {
  all: ['webhooks'] as const,
};

// Hooks

export function useWebhooks() {
  return useQuery({
    queryKey: webhookKeys.all,
    queryFn: () => apiClient.get<WebhookInfo[]>('/webhooks'),
  });
}

export function useCreateWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { url: string; events: string[] }) =>
      apiClient.post<NewWebhook>('/webhooks', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all });
    },
  });
}

export function useDeleteWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/webhooks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all });
    },
  });
}

export function useTestWebhook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<{ success: boolean }>(`/webhooks/${id}/test`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all });
    },
  });
}
