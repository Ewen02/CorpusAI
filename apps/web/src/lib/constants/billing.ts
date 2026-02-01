import {
  PLAN_PRICING,
  getFeatureLimits,
  type SubscriptionPlanType,
} from '@corpusai/subscription';

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

export const PLAN_DISPLAY_NAMES: Record<SubscriptionPlanType, string> = {
  FREE: 'Gratuit',
  CREATOR: 'Createur',
  PRO: 'Pro',
  ENTERPRISE: 'Enterprise',
};

export const PLAN_DESCRIPTIONS: Record<SubscriptionPlanType, string> = {
  FREE: 'Pour decouvrir CorpusAI',
  CREATOR: 'Pour les createurs de contenu',
  PRO: 'Pour les professionnels',
  ENTERPRISE: 'Pour les equipes',
};

export function buildPlanFeatures(plan: SubscriptionPlanType): PlanFeature[] {
  const limits = getFeatureLimits(plan);
  const isUnlimited = (val: number) => val === -1;

  return [
    {
      name: isUnlimited(limits.maxAIs)
        ? 'Assistants illimites'
        : `${limits.maxAIs} assistant${limits.maxAIs > 1 ? 's' : ''} IA`,
      included: true,
    },
    {
      name: isUnlimited(limits.maxDocumentsPerAI)
        ? 'Documents illimites'
        : `${limits.maxDocumentsPerAI} documents/AI`,
      included: true,
    },
    {
      name: isUnlimited(limits.maxQuestionsPerDay)
        ? 'Questions illimitees'
        : `${limits.maxQuestionsPerDay} questions/jour`,
      included: true,
    },
    {
      name: limits.dedicatedSupport
        ? 'Support dedie'
        : limits.sla
          ? 'Support prioritaire'
          : 'Support communautaire',
      included: true,
    },
    {
      name: 'Widget personnalise',
      included: limits.canUseWidget,
    },
    {
      name: 'Branding personnalise',
      included: limits.canCustomizeBranding,
    },
  ];
}

export const PLAN_ORDER: SubscriptionPlanType[] = ['FREE', 'CREATOR', 'PRO', 'ENTERPRISE'];

export const PLANS: PlanDisplay[] = PLAN_ORDER.map((planId) => ({
  id: planId,
  name: PLAN_DISPLAY_NAMES[planId],
  price: PLAN_PRICING[planId].monthly,
  period: 'mois',
  description: PLAN_DESCRIPTIONS[planId],
  features: buildPlanFeatures(planId),
  popular: planId === 'PRO',
}));
