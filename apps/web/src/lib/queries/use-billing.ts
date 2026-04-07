import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { track } from '../analytics';

type SubscriptionPlan = 'FREE' | 'CREATOR' | 'PRO' | 'ENTERPRISE';
type BillingPeriod = 'monthly' | 'yearly';

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
    onSuccess: (data, variables) => {
      track('checkout_started', {
        plan: variables.plan as SubscriptionPlan,
        period: variables.interval as BillingPeriod,
      });
      window.location.href = data.url;
    },
  });
}

export function useCustomerPortal() {
  return useMutation({
    mutationFn: () => apiClient.get<{ url: string }>('/billing/portal'),
    onSuccess: (data) => {
      track('billing_portal_opened');
      window.location.href = data.url;
    },
  });
}
