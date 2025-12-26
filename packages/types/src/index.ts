// ============================================
// ENUMS
// ============================================

export enum AIStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  INDEXED = 'INDEXED',
  FAILED = 'FAILED',
}

export enum AccessType {
  FREE = 'FREE',
  PAID = 'PAID',
  INVITE_ONLY = 'INVITE_ONLY',
  TIME_LIMITED = 'TIME_LIMITED',
}

export enum SubscriptionPlan {
  FREE = 'FREE',
  CREATOR = 'CREATOR',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  PAST_DUE = 'PAST_DUE',
  TRIALING = 'TRIALING',
}

// ============================================
// INTERFACES - Core Entities
// ============================================

export interface CreatorData {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
  subscriptionPlan: SubscriptionPlan;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  creatorId: string;
  status: AIStatus;
  systemPrompt: string | null;
  settings: AISettings;
  documentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AISettings {
  welcomeMessage: string | null;
  primaryColor: string;
  logoUrl: string | null;
  maxTokensPerResponse: number;
  temperature: number;
}

export interface DocumentData {
  id: string;
  aiId: string;
  filename: string;
  originalSize: number;
  mimeType: string;
  status: DocumentStatus;
  chunkCount: number;
  metadata: DocumentMetadata | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocumentMetadata {
  pageCount?: number;
  wordCount?: number;
  language?: string;
  title?: string;
  author?: string;
}

export interface EndUserData {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
}

export interface ConversationData {
  id: string;
  aiId: string;
  userId: string;
  title: string | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageData {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  sources: SourceReference[];
  createdAt: Date;
}

export interface SourceReference {
  documentId: string;
  documentName: string;
  excerpt: string;
  relevanceScore: number;
  pageNumber?: number;
  chunkIndex?: number;
}

// ============================================
// INTERFACES - API Responses
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// ============================================
// INTERFACES - AI Response
// ============================================

export interface AIResponse {
  message: string;
  sources: SourceReference[];
  confidence: 'high' | 'medium' | 'low';
  warnings?: string[];
  tokenUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
}

// ============================================
// CONSTANTS
// ============================================

export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/csv',
] as const;

export type SupportedDocumentType = (typeof SUPPORTED_DOCUMENT_TYPES)[number];

export const DEFAULT_AI_SETTINGS: AISettings = {
  welcomeMessage: null,
  primaryColor: '#3b82f6',
  logoUrl: null,
  maxTokensPerResponse: 1024,
  temperature: 0.7,
};
