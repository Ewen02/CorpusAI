/**
 * @corpusai/types
 * Shared types between backend and frontend.
 */

// Constants
export { SUPPORTED_DOCUMENT_TYPES } from "./constants";
export type { SupportedDocumentType } from "./constants";

// Enums
export {
  SubscriptionPlan,
  SubscriptionStatus,
  AIStatus,
  AccessType,
  DocumentStatus,
  MessageRole,
  ConfidenceLevel,
} from "./enums";

// Entity types
export type {
  User,
  AIData,
  AI,
  Document,
  Conversation,
  Message,
  MessageSource,
  EndUser,
  SourceReference,
} from "./entities";

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
} from "./api";
