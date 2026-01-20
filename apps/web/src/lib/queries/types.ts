/**
 * Re-export types from @corpusai/types for backward compatibility.
 * Prefer importing directly from @corpusai/types in new code.
 */

// Re-export everything from the shared types package
export type {
  // Enums as types
  AIStatus,
  DocumentStatus,
  MessageRole,
  ConfidenceLevel,
  // Entities
  AI,
  Document,
  Message,
  MessageSource,
  // API types
  SendMessageResponse,
  StartConversationResponse,
} from "@corpusai/types";

// Conversation type with lastMessage for list views
export interface Conversation {
  id: string;
  title?: string;
  lastMessage?: string;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}
