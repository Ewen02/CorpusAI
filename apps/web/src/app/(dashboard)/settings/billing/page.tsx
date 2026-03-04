'use client';

import * as React from 'react';
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
import { useDashboardStats } from '@/lib/queries';
import { CheckIcon, XIcon, ReceiptIcon } from '@/lib/icons';
import { PLANS, PLAN_DISPLAY_NAMES } from '@/lib/constants';
import {
  getFeatureLimits,
  getRemainingUsage,
  type SubscriptionPlanType,
} from '@corpusai/subscription';
import { PageWrapper } from '@/components/page-wrapper';

export default function SettingsBillingPage() {
  const { data: stats, isLoading } = useDashboardStats();

  const currentPlan = (stats?.subscriptionPlan || 'FREE') as SubscriptionPlanType;

  const handleUpgrade = (planId: SubscriptionPlanType) => {
    // TODO: Integrate Stripe checkout
    alert(
      `L'integration Stripe sera ajoutee prochainement pour passer au plan ${PLAN_DISPLAY_NAMES[planId]}`
    );
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

  const currentPlanData = PLANS.find((p) => p.id === currentPlan) ?? PLANS[0]!;
  const currentLimits = getFeatureLimits(currentPlan);

  const aiRemaining = getRemainingUsage(currentPlan, 'ais', stats?.aiCount || 0);
  const questionsRemaining = getRemainingUsage(currentPlan, 'questions', stats?.questionCount || 0);

  const formatRemaining = (value: number | 'unlimited') =>
    value === 'unlimited' ? '∞' : value.toString();

  return (
    <PageWrapper className="space-y-6">
      {/* Current Plan */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Votre abonnement</CardTitle>
          <CardDescription>Gerez votre plan et votre facturation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{currentPlanData.name}</h3>
                {currentPlan !== 'FREE' && <Badge variant="secondary">Actif</Badge>}
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
            <h4 className="mb-3 text-sm font-medium">Utilisation actuelle</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-2xl font-bold">{stats?.aiCount || 0}</p>
                <p className="text-xs text-muted-foreground">Assistant(s) IA</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Restant: {formatRemaining(aiRemaining)}/
                  {currentLimits.maxAIs === -1 ? '∞' : currentLimits.maxAIs}
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-2xl font-bold">{stats?.documentCount || 0}</p>
                <p className="text-xs text-muted-foreground">Documents</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Max/AI:{' '}
                  {currentLimits.maxDocumentsPerAI === -1 ? '∞' : currentLimits.maxDocumentsPerAI}
                </p>
              </div>
              <div className="rounded-lg bg-muted/30 p-4">
                <p className="text-2xl font-bold">{stats?.questionCount || 0}</p>
                <p className="text-xs text-muted-foreground">Questions aujourd'hui</p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Restant: {formatRemaining(questionsRemaining)}/
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
          <CardTitle>Changer de plan</CardTitle>
          <CardDescription>Choisissez le plan adapte a vos besoins.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {PLANS.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              return (
                <div
                  key={plan.id}
                  className={`relative rounded-lg border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5 ${
                    plan.popular ? 'border-primary bg-primary/5' : 'border-border bg-card'
                  } ${isCurrent ? 'ring-2 ring-primary' : ''}`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">Populaire</Badge>
                  )}
                  {isCurrent && (
                    <Badge variant="secondary" className="absolute -top-2 right-4">
                      Actuel
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
                    {isCurrent ? 'Plan actuel' : 'Choisir ce plan'}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Historique de facturation</CardTitle>
          <CardDescription>Vos factures et paiements precedents.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <ReceiptIcon className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>Aucune facture disponible</p>
            <p className="text-sm">Vos factures apparaitront ici apres votre premier paiement.</p>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
