/**
 * Shared entity interfaces between backend and frontend.
 * These represent the API response shapes.
 */

import type {
  AIStatus,
  AccessType,
  DocumentStatus,
  MessageRole,
  ConfidenceLevel,
  SubscriptionPlan,
  SubscriptionStatus,
} from "./enums";

// ============================================
// USER
// ============================================

export interface User {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified: boolean;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// AI
// ============================================

/**
 * Minimal AI data for system prompt building.
 * Used by ai-rules package.
 */
export interface AIData {
  name: string;
  systemPrompt?: string | null;
}

export interface AI {
  id: string;
  userId: string;
  slug: string;
  name: string;
  description?: string | null;
  systemPrompt?: string | null;
  status: AIStatus;
  welcomeMessage?: string | null;
  primaryColor: string;
  logo?: string | null;
  maxTokens: number;
  temperature: number;
  accessType: AccessType;
  price?: number | null;
  documentCount: number;
  conversationCount: number;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
  /** @deprecated Use accessType instead. Computed field for backward compatibility. */
  isPublic?: boolean;
}

// ============================================
// DOCUMENT
// ============================================

export interface Document {
  id: string;
  aiId: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string | null;
  status: DocumentStatus;
  chunkCount: number;
  errorMessage?: string | null;
  pageCount?: number | null;
  wordCount?: number | null;
  language?: string | null;
  title?: string | null;
  author?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// CONVERSATION
// ============================================

export interface Conversation {
  id: string;
  aiId: string;
  endUserId?: string | null;
  title?: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// MESSAGE
// ============================================

export interface MessageSource {
  chunkId: string;
  documentSource: string;
  score: number;
  excerpt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  sources?: MessageSource[] | null;
  confidence?: ConfidenceLevel | null;
  tokenUsage?: number | null;
  latencyMs?: number | null;
  createdAt: string;
}

// ============================================
// END USER (widget users)
// ============================================

export interface EndUser {
  id: string;
  email?: string | null;
  name?: string | null;
  sessionId?: string | null;
  createdAt: string;
}

// ============================================
// SOURCE REFERENCE (for ai-rules package)
// ============================================

/**
 * Reference to a source used in a response.
 * Used by ai-rules package for validation.
 */
export interface SourceReference {
  chunkId?: string;
  documentName?: string;
  relevanceScore: number;
  excerpt?: string;
}
