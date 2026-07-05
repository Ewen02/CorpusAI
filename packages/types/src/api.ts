/**
 * API request/response types shared between backend and frontend.
 */

import type { Message, MessageSource } from './entities';

// ============================================
// CONVERSATION API
// ============================================

export interface StartConversationResponse {
  id: string;
  aiId: string;
  createdAt: string;
}

// ============================================
// MESSAGE API
// ============================================

export interface SendMessageResponse {
  userMessage: Message;
  assistantMessage: Message & {
    sources: MessageSource[];
  };
}

// ============================================
// STREAMING API
// ============================================

export interface StreamTokenEvent {
  type: 'token';
  data: { token: string };
}

export interface StreamSourcesEvent {
  type: 'sources';
  data: { sources: MessageSource[] };
}

export interface StreamDoneEvent {
  type: 'done';
  data: {
    userMessage: {
      id: string;
      role: string;
      content: string;
      createdAt: string;
    };
    assistantMessage: {
      id: string;
      role: string;
      content: string;
      sources: MessageSource[];
      confidence: string;
      feedback: 'positive' | 'negative' | null;
      createdAt: string;
    };
  };
}

export interface StreamErrorEvent {
  type: 'error';
  data: { message: string };
}

export type StreamEvent =
  | StreamTokenEvent
  | StreamSourcesEvent
  | StreamDoneEvent
  | StreamErrorEvent;
