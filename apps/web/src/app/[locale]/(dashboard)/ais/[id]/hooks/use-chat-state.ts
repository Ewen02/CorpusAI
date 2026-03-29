'use client';

import * as React from 'react';
import type { ChatMessage, ChatSource, ConfidenceLevel } from '@corpusai/ui';
import {
  useStartConversation,
  useSendMessageStream,
  useMessages,
  type MessageSource,
} from '@/lib/queries';

/**
 * Deduplicate sources by document name, keeping the one with highest score
 */
function deduplicateSources(sources: ChatSource[]): ChatSource[] {
  const map = new Map<string, ChatSource>();
  for (const source of sources) {
    const existing = map.get(source.documentName);
    if (!existing || source.relevanceScore > existing.relevanceScore) {
      map.set(source.documentName, source);
    }
  }
  return Array.from(map.values()).sort((a, b) => b.relevanceScore - a.relevanceScore);
}

interface UseChatStateOptions {
  aiSlug: string;
  username: string;
}

/**
 * Custom hook to manage chat state, messages, and streaming.
 * Centralizes all chat-related logic for the AI detail page.
 */
export function useChatState({ aiSlug, username }: UseChatStateOptions) {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [currentConversationId, setCurrentConversationId] = React.useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = React.useState<string | null>(null);

  const startConversation = useStartConversation();
  const { sendStream, isStreaming, streamingContent } = useSendMessageStream();

  // Load messages when conversation changes
  const { data: messagesData } = useMessages(currentConversationId);

  // Format messages from API
  React.useEffect(() => {
    if (messagesData) {
      const formattedMessages: ChatMessage[] = messagesData.map((msg) => ({
        id: msg.id,
        role: msg.role.toLowerCase() as 'user' | 'assistant',
        content: msg.content,
        createdAt: new Date(msg.createdAt),
        confidence: msg.confidence as ConfidenceLevel | undefined,
        sources: msg.sources
          ? deduplicateSources(
              msg.sources.map((s: MessageSource) => ({
                documentId: s.chunkId,
                documentName: s.documentSource,
                excerpt: s.excerpt,
                relevanceScore: s.score,
              }))
            )
          : undefined,
      }));
      setMessages(formattedMessages);
    }
  }, [messagesData]);

  // Update streaming message content in real-time
  React.useEffect(() => {
    if (isStreaming && streamingMessageId && streamingContent) {
      setMessages((prev) =>
        prev.map((m) => (m.id === streamingMessageId ? { ...m, content: streamingContent } : m))
      );
    }
  }, [isStreaming, streamingMessageId, streamingContent]);

  // Handle sending a message with streaming
  const sendMessage = React.useCallback(
    async (content: string) => {
      if (!aiSlug || isStreaming) return;

      // Add user message optimistically
      const userMessage: ChatMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date(),
      };

      // Add streaming assistant message placeholder
      const assistantMessageId = `temp-assistant-${Date.now()}`;
      const streamingAssistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        createdAt: new Date(),
        isStreaming: true,
      };

      setMessages((prev) => [...prev, userMessage, streamingAssistantMessage]);
      setStreamingMessageId(assistantMessageId);

      try {
        // Create conversation if needed
        let convId = currentConversationId;
        if (!convId) {
          const convData = await startConversation.mutateAsync({ username, slug: aiSlug });
          convId = convData.id;
          setCurrentConversationId(convId);
        }

        // Send message with streaming
        sendStream(convId, content, {
          onToken: (_token, fullContent) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMessageId ? { ...m, content: fullContent } : m))
            );
          },
          onSources: (sources) => {
            const formattedSources = deduplicateSources(
              sources.map((s) => ({
                documentId: s.chunkId,
                documentName: s.documentSource,
                excerpt: s.excerpt,
                relevanceScore: s.score,
              }))
            );
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId ? { ...m, sources: formattedSources } : m
              )
            );
          },
          onDone: (data) => {
            setMessages((prev) =>
              prev.map((m) => {
                if (m.id === userMessage.id) {
                  return {
                    ...m,
                    id: data.userMessage.id,
                    createdAt: new Date(data.userMessage.createdAt),
                  };
                }
                if (m.id === assistantMessageId) {
                  const formattedSources = deduplicateSources(
                    data.assistantMessage.sources.map((s) => ({
                      documentId: s.chunkId,
                      documentName: s.documentSource,
                      excerpt: s.excerpt,
                      relevanceScore: s.score,
                    }))
                  );
                  return {
                    ...m,
                    id: data.assistantMessage.id,
                    content: data.assistantMessage.content,
                    sources: formattedSources,
                    confidence: data.assistantMessage.confidence as ConfidenceLevel | undefined,
                    createdAt: new Date(data.assistantMessage.createdAt),
                    isStreaming: false,
                  };
                }
                return m;
              })
            );
            setStreamingMessageId(null);
          },
          onError: (error) => {
            console.error('Streaming error:', error);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessageId
                  ? {
                      ...m,
                      content: "Une erreur s'est produite. Veuillez reessayer.",
                      isStreaming: false,
                    }
                  : m
              )
            );
            setStreamingMessageId(null);
          },
        });
      } catch (error) {
        console.error('Error starting stream:', error);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMessageId
              ? {
                  ...m,
                  content: "Une erreur s'est produite. Veuillez reessayer.",
                  isStreaming: false,
                }
              : m
          )
        );
        setStreamingMessageId(null);
      }
    },
    [aiSlug, username, isStreaming, currentConversationId, startConversation, sendStream]
  );

  // Select a conversation
  const selectConversation = React.useCallback((conversationId: string) => {
    setCurrentConversationId(conversationId);
  }, []);

  // Start a new conversation
  const startNewConversation = React.useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
  }, []);

  return {
    messages,
    currentConversationId,
    isStreaming,
    sendMessage,
    selectConversation,
    startNewConversation,
  };
}
