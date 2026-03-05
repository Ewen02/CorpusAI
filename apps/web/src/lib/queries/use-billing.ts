import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const billingKeys = {
  invoices: ['billing', 'invoices'] as const,
};

export interface Invoice {
  id: string;
  status: string;
  amount: number;
  currency: string;
  date: string | null;
  pdfUrl: string | null;
}

export function useInvoices() {
  return useQuery({
    queryKey: billingKeys.invoices,
    queryFn: () => apiClient.get<Invoice[]>('/billing/invoices'),
  });
}

export function useCreateCheckout() {
  return useMutation({
    mutationFn: (data: { plan: string; interval: 'monthly' | 'yearly' }) =>
      apiClient.post<{ url: string }>('/billing/checkout', data),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
}

export function useCustomerPortal() {
  return useMutation({
    mutationFn: () => apiClient.get<{ url: string }>('/billing/portal'),
    onSuccess: (data) => {
      window.location.href = data.url;
    },
  });
}
