'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
  Separator,
} from '@corpusai/ui';
import {
  useDashboardStats,
  useCreateCheckout,
  useCustomerPortal,
  useInvoices,
} from '@/lib/queries';
import { CheckIcon, XIcon, ReceiptIcon } from '@/lib/icons';
import { buildPlans, getPlanDisplayName } from '@/lib/constants/billing';
import {
  getFeatureLimits,
  getRemainingUsage,
  type SubscriptionPlanType,
} from '@corpusai/subscription';
import { PageWrapper } from '@/components/page-wrapper';
import { FormAlert } from '@/components/form-alert';

export default function SettingsBillingPage() {
  const t = useTranslations('billing');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const checkoutSuccess = searchParams.get('success') === 'true';
  const checkoutCanceled = searchParams.get('canceled') === 'true';
  const { data: stats, isLoading } = useDashboardStats();
  const { data: invoices } = useInvoices();
  const createCheckout = useCreateCheckout();
  const customerPortal = useCustomerPortal();

  const currentPlan = (stats?.subscriptionPlan || 'FREE') as SubscriptionPlanType;
  const plans = React.useMemo(() => buildPlans(t), [t]);

  const handleUpgrade = (planId: SubscriptionPlanType) => {
    if (planId === 'FREE') return;
    createCheckout.mutate({ plan: planId, interval: 'monthly' });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlanData = plans.find((p) => p.id === currentPlan) ?? plans[0]!;
  const currentLimits = getFeatureLimits(currentPlan);

  const aiRemaining = getRemainingUsage(currentPlan, 'ais', stats?.aiCount || 0);
  const questionsRemaining = getRemainingUsage(currentPlan, 'questions', stats?.questionCount || 0);

  const formatRemaining = (value: number | 'unlimited') =>
    value === 'unlimited' ? '∞' : value.toString();

  return (
    <PageWrapper className="space-y-6">
      {checkoutSuccess && <FormAlert message={t('checkoutSuccess')} variant="success" />}
      {checkoutCanceled && <FormAlert message={t('checkoutCanceled')} variant="warning" />}

      {/* Current Plan */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{currentPlanData.name}</h3>
                {currentPlan !== 'FREE' && <Badge variant="secondary">{t('active')}</Badge>}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{currentPlanData.description}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {currentPlanData.price}€
                <span className="text-sm font-normal text-muted-foreground">
                  /{currentPlanData.period}
                </span>
              </p>
            </div>
          </div>

          {/* Usage Stats */}
          <div>
            <h4 className="mb-3 text-sm font-medium">{t('currentUsage')}</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-2xl font-bold">{stats?.aiCount || 0}</p>
                <p className="text-xs text-muted-foreground">{t('aiAssistants')}</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {t('remaining')}: {formatRemaining(aiRemaining)}/
                  {currentLimits.maxAIs === -1 ? '∞' : currentLimits.maxAIs}
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-2xl font-bold">{stats?.documentCount || 0}</p>
                <p className="text-xs text-muted-foreground">{t('documents')}</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {t('maxPerAI')}:{' '}
                  {currentLimits.maxDocumentsPerAI === -1 ? '∞' : currentLimits.maxDocumentsPerAI}
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-2xl font-bold">{stats?.questionCount || 0}</p>
                <p className="text-xs text-muted-foreground">{t('questionsToday')}</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  {t('remaining')}: {formatRemaining(questionsRemaining)}/
                  {currentLimits.maxQuestionsPerDay === -1 ? '∞' : currentLimits.maxQuestionsPerDay}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('changePlan')}</CardTitle>
          <CardDescription>{t('changePlanDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-lg border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 ${
                    plan.popular ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  } ${isCurrent ? 'ring-2 ring-primary' : ''}`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                      {t('popular')}
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge variant="secondary" className="absolute -top-2 right-4">
                      {t('currentPlan')}
                    </Badge>
                  )}

                  <div className="mb-4 text-center">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="mt-2 text-3xl font-bold">
                      {plan.price}€
                      <span className="text-sm font-normal text-muted-foreground">
                        /{plan.period}
                      </span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
                  </div>

                  <Separator className="my-4" />

                  <ul className="mb-6 space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <CheckIcon className="h-4 w-4 shrink-0 text-green-500" />
                        ) : (
                          <XIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        )}
                        <span className={feature.included ? '' : 'text-muted-foreground'}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : plan.popular ? 'default' : 'secondary'}
                    disabled={isCurrent}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isCurrent ? t('currentPlan') : t('choosePlan')}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Manage Subscription */}
      {currentPlan !== 'FREE' && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>{t('manageBilling')}</CardTitle>
            <CardDescription>{t('manageBillingDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              onClick={() => customerPortal.mutate()}
              disabled={customerPortal.isPending}
            >
              {customerPortal.isPending ? t('redirecting') : t('openPortal')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Payment History */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('invoiceHistory')}</CardTitle>
          <CardDescription>{t('invoiceHistoryDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices && invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between rounded-lg bg-muted/30 p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {invoice.date
                        ? new Date(invoice.date).toLocaleDateString(locale, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })
                        : t('unknownDate')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(invoice.amount / 100).toFixed(2)} {invoice.currency.toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={invoice.status === 'paid' ? 'secondary' : 'destructive'}>
                      {invoice.status === 'paid' ? t('paid') : invoice.status}
                    </Badge>
                    {invoice.pdfUrl && (
                      <Button variant="ghost" size="sm" asChild>
                        <a href={invoice.pdfUrl} target="_blank" rel="noopener noreferrer">
                          PDF
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <ReceiptIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
              <p>{t('noInvoices')}</p>
              <p className="text-sm">{t('noInvoicesDescription')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
