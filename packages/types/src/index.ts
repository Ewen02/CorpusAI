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
  ProcessingStep,
  MessageRole,
  ConfidenceLevel,
  AccessStatus,
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
  AIAccessGrant,
  SourceReference,
} from './entities';

// API types
export type {
  // Conversation
  StartConversationResponse,
  // Message
  SendMessageResponse,
  // Streaming
  StreamTokenEvent,
  StreamSourcesEvent,
  StreamDoneEvent,
  StreamErrorEvent,
  StreamEvent,
} from './api';
