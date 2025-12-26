// Re-export Prisma client
export { prisma, type PrismaClient } from "./client";

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
  Conversation,
  Message,
} from "@prisma/client";

// Re-export enums
export {
  SubscriptionPlan,
  SubscriptionStatus,
  AIStatus,
  AccessType,
  DocumentStatus,
  MessageRole,
  ConfidenceLevel,
} from "@prisma/client";
