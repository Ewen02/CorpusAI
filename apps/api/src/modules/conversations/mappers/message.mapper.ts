/**
 * Message transformation utilities.
 * Centralizes the mapping between database entities and API responses.
 */

import type { Message, ConfidenceLevel } from "@corpusai/database";

/**
 * Source as stored in database (JSON field).
 */
export interface StoredSource {
  chunkId: string;
  documentSource: string;
  score: number;
  excerpt: string;
}

/**
 * Source response for API consumers.
 */
export interface SourceResponse {
  chunkId: string;
  documentSource: string;
  score: number;
  excerpt: string;
}

/**
 * Message response for API consumers.
 */
export interface MessageResponse {
  id: string;
  role: string;
  content: string;
  sources?: SourceResponse[];
  confidence?: ConfidenceLevel;
  createdAt: Date;
}

/**
 * Transforms a database message to API response format.
 */
export function toMessageResponse(message: Message): MessageResponse {
  const sources = message.sources
    ? (message.sources as unknown as StoredSource[]).map(toSourceResponse)
    : undefined;

  return {
    id: message.id,
    role: message.role,
    content: message.content,
    sources,
    confidence: message.confidence ?? undefined,
    createdAt: message.createdAt,
  };
}

/**
 * Transforms a stored source to API response format.
 */
export function toSourceResponse(source: StoredSource): SourceResponse {
  return {
    chunkId: source.chunkId,
    documentSource: source.documentSource,
    score: source.score,
    excerpt: source.excerpt,
  };
}

/**
 * Transforms an array of messages to API response format.
 */
export function toMessagesResponse(messages: Message[]): MessageResponse[] {
  return messages.map(toMessageResponse);
}
