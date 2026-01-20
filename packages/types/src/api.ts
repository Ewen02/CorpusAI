/**
 * API request/response types shared between backend and frontend.
 */

import type { AI, Conversation, Document, Message, MessageSource } from "./entities";

// ============================================
// AI API
// ============================================

export interface CreateAIRequest {
  name: string;
  slug?: string;
  description?: string;
}

export interface UpdateAIRequest {
  name?: string;
  description?: string;
  systemPrompt?: string;
  welcomeMessage?: string;
  primaryColor?: string;
  maxTokens?: number;
  temperature?: number;
}

export type AIResponse = AI;

export type AIListResponse = AI[];

// ============================================
// DOCUMENT API
// ============================================

export interface CreateTextDocumentRequest {
  filename: string;
  content: string;
}

export type DocumentResponse = Document;

export type DocumentListResponse = Document[];

// ============================================
// CONVERSATION API
// ============================================

export interface StartConversationRequest {
  sessionId?: string;
}

export interface StartConversationResponse {
  id: string;
  aiId: string;
  createdAt: string;
}

export type ConversationResponse = Conversation & {
  messages?: Message[];
};

export type ConversationListResponse = (Conversation & {
  lastMessage?: string;
})[];

// ============================================
// MESSAGE API
// ============================================

export interface SendMessageRequest {
  content: string;
}

export interface SendMessageResponse {
  userMessage: Message;
  assistantMessage: Message & {
    sources: MessageSource[];
  };
}

export type MessageListResponse = Message[];

// ============================================
// STREAMING API
// ============================================

export interface StreamTokenEvent {
  type: "token";
  data: { token: string };
}

export interface StreamSourcesEvent {
  type: "sources";
  data: { sources: MessageSource[] };
}

export interface StreamDoneEvent {
  type: "done";
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
      createdAt: string;
    };
  };
}

export interface StreamErrorEvent {
  type: "error";
  data: { message: string };
}

export type StreamEvent =
  | StreamTokenEvent
  | StreamSourcesEvent
  | StreamDoneEvent
  | StreamErrorEvent;
