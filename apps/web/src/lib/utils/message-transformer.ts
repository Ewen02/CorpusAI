/**
 * Message transformation utilities.
 * Centralizes the mapping between API responses and UI components.
 */

import type { ChatMessage, ChatSource } from '@corpusai/ui';
import type { MessageSource } from '@/lib/queries';

/**
 * API message response structure.
 */
export interface APIMessage {
  id: string;
  role: string;
  content: string;
  sources?: MessageSource[];
  confidence?: string;
  createdAt: string;
}

/**
 * Transforms API message sources to ChatSource format.
 */
export function transformSources(sources: MessageSource[]): ChatSource[] {
  return sources.map((source) => ({
    documentId: source.chunkId,
    documentName: source.documentSource,
    excerpt: source.excerpt,
    relevanceScore: source.score,
  }));
}

/**
 * Transforms a single API message to ChatMessage format.
 */
export function transformMessage(message: APIMessage): ChatMessage {
  return {
    id: message.id,
    role: message.role.toLowerCase() as 'user' | 'assistant',
    content: message.content,
    createdAt: new Date(message.createdAt),
    sources: message.sources ? transformSources(message.sources) : undefined,
  };
}

/**
 * Transforms an array of API messages to ChatMessage format.
 */
export function transformMessages(messages: APIMessage[]): ChatMessage[] {
  return messages.map(transformMessage);
}
