// Re-export Prisma client
export { prisma, type PrismaClient, type TransactionClient } from './client';

// Re-export all Prisma types
export type {
  User,
  Session,
  Account,
  Verification,
  AI,
  Document,
  Chunk,
  EndUser,
  AIAccessGrant,
  Conversation,
  Message,
} from '@prisma/client';

// Re-export enums
export {
  SubscriptionPlan,
  SubscriptionStatus,
  AIStatus,
  AICategory,
  AccessType,
  AccessStatus,
  DocumentStatus,
  ProcessingStep,
  MessageRole,
  ConfidenceLevel,
  ConversationSource,
  UserRole,
} from '@prisma/client';
