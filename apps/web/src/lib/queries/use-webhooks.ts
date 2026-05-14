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

export interface WebhookDeliveryDetail extends WebhookDelivery {
  attempt: number;
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

export interface WebhookDetail {
  id: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  lastDeliveredAt: string | null;
  failureCount: number;
}

export interface NewWebhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
}

export interface WebhookDeliveriesPage {
  items: WebhookDeliveryDetail[];
  total: number;
}

export interface WebhookDeliveryResult {
  success: boolean;
  statusCode: number | null;
  latencyMs: number;
  error?: string;
}

// Keys

export const webhookKeys = {
  all: ['webhooks'] as const,
  detail: (id: string) => ['webhooks', id] as const,
  deliveries: (id: string) => ['webhooks', id, 'deliveries'] as const,
};

// Hooks

export function useWebhooks() {
  return useQuery({
    queryKey: webhookKeys.all,
    queryFn: () => apiClient.get<WebhookInfo[]>('/webhooks'),
    staleTime: 60 * 1000,
  });
}

export function useWebhook(id: string) {
  return useQuery({
    queryKey: webhookKeys.detail(id),
    queryFn: () => apiClient.get<WebhookDetail>(`/webhooks/${id}`),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

export function useWebhookDeliveries(id: string, take: number = 20) {
  return useQuery({
    queryKey: [...webhookKeys.deliveries(id), { take }],
    queryFn: () =>
      apiClient.get<WebhookDeliveriesPage>(`/webhooks/${id}/deliveries?skip=0&take=${take}`),
    enabled: Boolean(id),
    staleTime: 15 * 1000,
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
    mutationFn: ({ id, eventType }: { id: string; eventType?: string }) =>
      apiClient.post<WebhookDeliveryResult>(`/webhooks/${id}/test`, eventType ? { eventType } : {}),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all });
      queryClient.invalidateQueries({ queryKey: webhookKeys.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: webhookKeys.deliveries(variables.id) });
    },
  });
}

export function useRetryWebhookDelivery(webhookId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deliveryId: string) =>
      apiClient.post<WebhookDeliveryResult>(
        `/webhooks/${webhookId}/deliveries/${deliveryId}/retry`
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: webhookKeys.all });
      queryClient.invalidateQueries({ queryKey: webhookKeys.detail(webhookId) });
      queryClient.invalidateQueries({ queryKey: webhookKeys.deliveries(webhookId) });
    },
  });
}
