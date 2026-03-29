import { PLAN_PRICING, getFeatureLimits, type SubscriptionPlanType } from '@corpusai/subscription';

export interface PlanFeature {
  name: string;
  included: boolean;
}

export interface PlanDisplay {
  id: SubscriptionPlanType;
  name: string;
  price: number;
  period: string;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
}

type TranslationFn = (key: string, values?: Record<string, string | number>) => string;

export function getPlanDisplayName(plan: SubscriptionPlanType, t: TranslationFn): string {
  const key = `plan${plan.charAt(0)}${plan.slice(1).toLowerCase()}`;
  return t(key);
}

export function getPlanDescription(plan: SubscriptionPlanType, t: TranslationFn): string {
  const key = `desc${plan.charAt(0)}${plan.slice(1).toLowerCase()}`;
  return t(key);
}

export function buildPlanFeatures(plan: SubscriptionPlanType, t: TranslationFn): PlanFeature[] {
  const limits = getFeatureLimits(plan);
  const isUnlimited = (val: number) => val === -1;

  return [
    {
      name: isUnlimited(limits.maxAIs)
        ? t('unlimitedAssistants')
        : t('assistantCount', { count: limits.maxAIs }),
      included: true,
    },
    {
      name: isUnlimited(limits.maxDocumentsPerAI)
        ? t('unlimitedDocuments')
        : t('documentsPerAI', { count: limits.maxDocumentsPerAI }),
      included: true,
    },
    {
      name: isUnlimited(limits.maxQuestionsPerDay)
        ? t('unlimitedQuestions')
        : t('questionsPerDayCount', { count: limits.maxQuestionsPerDay }),
      included: true,
    },
    {
      name: limits.dedicatedSupport
        ? t('dedicatedSupport')
        : limits.sla
          ? t('prioritySupport')
          : t('communitySupport'),
      included: true,
    },
    {
      name: t('customWidget'),
      included: limits.canUseWidget,
    },
    {
      name: t('customBranding'),
      included: limits.canCustomizeBranding,
    },
  ];
}

export const PLAN_ORDER: SubscriptionPlanType[] = ['FREE', 'CREATOR', 'PRO', 'ENTERPRISE'];

export function buildPlans(t: TranslationFn): PlanDisplay[] {
  return PLAN_ORDER.map((planId) => ({
    id: planId,
    name: getPlanDisplayName(planId, t),
    price: PLAN_PRICING[planId].monthly,
    period: t('month'),
    description: getPlanDescription(planId, t),
    features: buildPlanFeatures(planId, t),
    popular: planId === 'PRO',
  }));
}
