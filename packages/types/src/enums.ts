/**
 * Shared enums between backend and frontend.
 * These mirror the Prisma schema enums.
 */

// ============================================
// SUBSCRIPTION
// ============================================

export const SubscriptionPlan = {
  FREE: "FREE",
  CREATOR: "CREATOR",
  PRO: "PRO",
  ENTERPRISE: "ENTERPRISE",
} as const;

export type SubscriptionPlan = (typeof SubscriptionPlan)[keyof typeof SubscriptionPlan];

export const SubscriptionStatus = {
  ACTIVE: "ACTIVE",
  CANCELED: "CANCELED",
  PAST_DUE: "PAST_DUE",
  TRIALING: "TRIALING",
} as const;

export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];

// ============================================
// AI
// ============================================

export const AIStatus = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  ARCHIVED: "ARCHIVED",
} as const;

export type AIStatus = (typeof AIStatus)[keyof typeof AIStatus];

export const AccessType = {
  FREE: "FREE",
  PAID: "PAID",
  INVITE_ONLY: "INVITE_ONLY",
  TIME_LIMITED: "TIME_LIMITED",
} as const;

export type AccessType = (typeof AccessType)[keyof typeof AccessType];

// ============================================
// DOCUMENT
// ============================================

export const DocumentStatus = {
  PENDING: "PENDING",
  PROCESSING: "PROCESSING",
  INDEXED: "INDEXED",
  FAILED: "FAILED",
} as const;

export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];

// ============================================
// MESSAGE
// ============================================

export const MessageRole = {
  USER: "USER",
  ASSISTANT: "ASSISTANT",
} as const;

export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export const ConfidenceLevel = {
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
} as const;

export type ConfidenceLevel = (typeof ConfidenceLevel)[keyof typeof ConfidenceLevel];
