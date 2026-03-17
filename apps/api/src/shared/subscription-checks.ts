import { ForbiddenException } from '@nestjs/common';
import {
  canCreateAI,
  canAddDocument,
  canUploadDocument,
  canAskQuestion,
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
