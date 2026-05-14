import { ForbiddenException } from '@nestjs/common';
import {
  canCreateAI,
  canAddDocument,
  canUploadDocument,
  canAskQuestion,
  canAddEndUser,
  type SubscriptionPlanType,
} from '@corpusai/subscription';

/**
 * Throws ForbiddenException if the user cannot create a new AI.
 */
export function assertCanCreateAI(plan: SubscriptionPlanType, currentAICount: number): void {
  if (!canCreateAI(plan, currentAICount)) {
    throw new ForbiddenException(
      `Your ${plan} plan has reached the maximum number of AIs. Upgrade your plan to create more.`
    );
  }
}

/**
 * Throws ForbiddenException if the AI cannot accept more documents.
 */
export function assertCanAddDocument(plan: SubscriptionPlanType, currentDocCount: number): void {
  if (!canAddDocument(plan, currentDocCount)) {
    throw new ForbiddenException(
      `This AI has reached the maximum number of documents for the ${plan} plan. Upgrade to add more.`
    );
  }
}

/**
 * Throws ForbiddenException if the document exceeds the size limit.
 */
export function assertCanUploadDocument(plan: SubscriptionPlanType, sizeMB: number): void {
  if (!canUploadDocument(plan, sizeMB)) {
    throw new ForbiddenException(`File exceeds the maximum upload size for the ${plan} plan.`);
  }
}

/**
 * Throws ForbiddenException if the daily question limit is reached.
 */
export function assertCanAskQuestion(plan: SubscriptionPlanType, questionsToday: number): void {
  if (!canAskQuestion(plan, questionsToday)) {
    throw new ForbiddenException('Daily question limit reached for this AI');
  }
}

/**
 * Throws ForbiddenException if the AI cannot accept more end users (members).
 */
export function assertCanAddEndUser(plan: SubscriptionPlanType, currentCount: number): void {
  if (!canAddEndUser(plan, currentCount)) {
    throw new ForbiddenException(
      `Your ${plan} plan has reached the maximum number of members. Upgrade your plan to invite more.`
    );
  }
}

/**
 * Plans allowed to pick a non-default LLM provider (anthropic, groq).
 * OpenAI remains available on every plan.
 */
const PROVIDER_GATED_PLANS: readonly SubscriptionPlanType[] = ['PRO', 'ENTERPRISE'];

/**
 * Throws ForbiddenException when a user on FREE/CREATOR tries to switch the
 * AI's `llmProvider` to anything other than `openai`. Multi-provider routing
 * is a PRO+ feature.
 */
export function assertCanUseLLMProvider(plan: SubscriptionPlanType, provider: string): void {
  if (provider === 'openai') return;
  if (!PROVIDER_GATED_PLANS.includes(plan)) {
    throw new ForbiddenException(
      `LLM provider "${provider}" is only available on PRO plans and above. ` +
        `Upgrade your plan or keep the default OpenAI provider.`
    );
  }
}
