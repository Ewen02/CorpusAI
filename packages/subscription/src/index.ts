// Use string literal type for compatibility with both Prisma and @corpusai/types enums
export type SubscriptionPlanType = 'FREE' | 'CREATOR' | 'PRO' | 'ENTERPRISE';

// ============================================
// FEATURE LIMITS PER PLAN
// ============================================

export interface FeatureLimits {
  maxAIs: number;
  maxDocumentsPerAI: number;
  maxDocumentSizeMB: number;
  maxQuestionsPerDay: number;
  maxEndUsers: number;
  canMonetize: boolean;
  canCustomizeBranding: boolean;
  canUseWidget: boolean;
  retentionDays: number;
  sla: boolean;
  dedicatedSupport: boolean;
}

export const FEATURE_LIMITS: Record<SubscriptionPlanType, FeatureLimits> = {
  FREE: {
    maxAIs: 1,
    maxDocumentsPerAI: 5,
    maxDocumentSizeMB: 10,
    maxQuestionsPerDay: 20,
    maxEndUsers: 10,
    canMonetize: false,
    canCustomizeBranding: false,
    canUseWidget: false,
    retentionDays: 30,
    sla: false,
    dedicatedSupport: false,
  },
  CREATOR: {
    maxAIs: 3,
    maxDocumentsPerAI: 50,
    maxDocumentSizeMB: 50,
    maxQuestionsPerDay: 500,
    maxEndUsers: 100,
    canMonetize: true,
    canCustomizeBranding: false,
    canUseWidget: true,
    retentionDays: 90,
    sla: false,
    dedicatedSupport: false,
  },
  PRO: {
    maxAIs: 10,
    maxDocumentsPerAI: 200,
    maxDocumentSizeMB: 100,
    maxQuestionsPerDay: -1, // Unlimited
    maxEndUsers: -1, // Unlimited
    canMonetize: true,
    canCustomizeBranding: true,
    canUseWidget: true,
    retentionDays: 365,
    sla: false,
    dedicatedSupport: false,
  },
  ENTERPRISE: {
    maxAIs: -1, // Unlimited
    maxDocumentsPerAI: -1, // Unlimited
    maxDocumentSizeMB: 500,
    maxQuestionsPerDay: -1, // Unlimited
    maxEndUsers: -1, // Unlimited
    canMonetize: true,
    canCustomizeBranding: true,
    canUseWidget: true,
    retentionDays: -1, // Unlimited
    sla: true,
    dedicatedSupport: true,
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get feature limits for a subscription plan
 */
export function getFeatureLimits(plan: SubscriptionPlanType): FeatureLimits {
  return FEATURE_LIMITS[plan];
}

/**
 * Check if a plan allows unlimited value for a limit (-1 means unlimited)
 */
function isUnlimited(value: number): boolean {
  return value === -1;
}

/**
 * Check if a creator can create a new AI based on their plan
 */
export function canCreateAI(plan: SubscriptionPlanType, currentCount: number): boolean {
  const limits = getFeatureLimits(plan);
  return isUnlimited(limits.maxAIs) || currentCount < limits.maxAIs;
}

/**
 * Check if a document size is within plan limits
 */
export function canUploadDocument(plan: SubscriptionPlanType, sizeMB: number): boolean {
  const limits = getFeatureLimits(plan);
  return sizeMB <= limits.maxDocumentSizeMB;
}

/**
 * Check if an AI can have more documents
 */
export function canAddDocument(plan: SubscriptionPlanType, currentDocCount: number): boolean {
  const limits = getFeatureLimits(plan);
  return isUnlimited(limits.maxDocumentsPerAI) || currentDocCount < limits.maxDocumentsPerAI;
}

/**
 * Check if a user has remaining questions for the day
 */
export function canAskQuestion(plan: SubscriptionPlanType, questionsToday: number): boolean {
  const limits = getFeatureLimits(plan);
  return isUnlimited(limits.maxQuestionsPerDay) || questionsToday < limits.maxQuestionsPerDay;
}

/**
 * Check if the plan allows monetization
 */
export function canMonetize(plan: SubscriptionPlanType): boolean {
  return getFeatureLimits(plan).canMonetize;
}

/**
 * Check if the plan allows custom branding
 */
export function canCustomizeBranding(plan: SubscriptionPlanType): boolean {
  return getFeatureLimits(plan).canCustomizeBranding;
}

/**
 * Check if the plan allows widget usage
 */
export function canUseWidget(plan: SubscriptionPlanType): boolean {
  return getFeatureLimits(plan).canUseWidget;
}

/**
 * Get the minimum required plan for a feature
 */
export function getRequiredPlanFor(feature: keyof FeatureLimits): SubscriptionPlanType {
  const plans: SubscriptionPlanType[] = ['FREE', 'CREATOR', 'PRO', 'ENTERPRISE'];

  for (const plan of plans) {
    const limits = getFeatureLimits(plan);
    const value = limits[feature];

    // For boolean features
    if (typeof value === 'boolean' && value === true) {
      return plan;
    }

    // For numeric features (if unlimited or > 0)
    if (typeof value === 'number' && (isUnlimited(value) || value > 0)) {
      return plan;
    }
  }

  return 'ENTERPRISE';
}

/**
 * Calculate remaining usage for a specific limit
 */
export function getRemainingUsage(
  plan: SubscriptionPlanType,
  limitType: 'ais' | 'documents' | 'questions' | 'users',
  currentUsage: number
): number | 'unlimited' {
  const limits = getFeatureLimits(plan);

  const limitMap = {
    ais: limits.maxAIs,
    documents: limits.maxDocumentsPerAI,
    questions: limits.maxQuestionsPerDay,
    users: limits.maxEndUsers,
  };

  const limit = limitMap[limitType];

  if (isUnlimited(limit)) {
    return 'unlimited';
  }

  return Math.max(0, limit - currentUsage);
}

// ============================================
// PRICING (for display purposes)
// ============================================

export const PLAN_PRICING: Record<SubscriptionPlanType, { monthly: number; yearly: number }> = {
  FREE: { monthly: 0, yearly: 0 },
  CREATOR: { monthly: 19, yearly: 190 },
  PRO: { monthly: 49, yearly: 490 },
  ENTERPRISE: { monthly: 199, yearly: 1990 },
};

export function getPlanPrice(
  plan: SubscriptionPlanType,
  interval: 'monthly' | 'yearly'
): number {
  return PLAN_PRICING[plan][interval];
}
