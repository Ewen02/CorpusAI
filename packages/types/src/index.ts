/**
 * @corpusai/types
 * Shared types between backend and frontend.
 */

// Constants
export { SUPPORTED_DOCUMENT_TYPES, DEFAULT_SCORE_THRESHOLD } from './constants';
export type { SupportedDocumentType } from './constants';

// Enums
export {
  SubscriptionPlan,
  SubscriptionStatus,
  AIStatus,
  AICategory,
  AccessType,
  DocumentStatus,
  MessageRole,
  ConfidenceLevel,
} from './enums';

// Entity types
export type {
  User,
  AIData,
  AI,
  AIPublicInfo,
  Document,
  Conversation,
  Message,
  MessageSource,
  EndUser,
  SourceReference,
} from './entities';

// API types
export type {
  // AI
  CreateAIRequest,
  UpdateAIRequest,
  AIResponse,
  AIListResponse,
  // Document
  CreateTextDocumentRequest,
  DocumentResponse,
  DocumentListResponse,
  // Conversation
  StartConversationRequest,
  StartConversationResponse,
  ConversationResponse,
  ConversationListResponse,
  // Message
  SendMessageRequest,
  SendMessageResponse,
  MessageListResponse,
  // Streaming
  StreamTokenEvent,
  StreamSourcesEvent,
  StreamDoneEvent,
  StreamErrorEvent,
  StreamEvent,
} from './api';
