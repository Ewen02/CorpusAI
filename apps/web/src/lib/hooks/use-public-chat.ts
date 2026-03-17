'use client';

import * as React from 'react';
import { apiClient, type StreamDoneData } from '@/lib/api-client';
import type { ChatMessage } from '@corpusai/ui';
import type { AIPublicInfo, StartConversationResponse } from '@corpusai/types';
import { mapSourcesToChat } from '@/lib/utils/chat-session';

export { getOrCreateSessionId, mapSourcesToChat } from '@/lib/utils/chat-session';

// ============================================
// Hook
// ============================================

interface UsePublicChatOptions {
  slug: string;
}

interface UsePublicChatReturn {
  ai: AIPublicInfo | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  sendMessage: (content: string) => void;
}

export function usePublicChat({ slug }: UsePublicChatOptions): UsePublicChatReturn {
  const [ai, setAI] = React.useState<AIPublicInfo | null>(null);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Fetch AI info
  React.useEffect(() => {
    async function fetchAI() {
      try {
        const data = await apiClient.get<AIPublicInfo>(`/chat/${slug}/info`);

        if (!data.isPublic) {
          setError("Cet assistant n'est pas accessible publiquement.");
          return;
        }

        if (data.status !== 'ACTIVE') {
          setError("Cet assistant n'est pas disponible actuellement.");
          return;
        }

        setAI(data);
      } catch {
        setError('Assistant introuvable.');
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) fetchAI();
  }, [slug]);

  // Start conversation
  React.useEffect(() => {
    async function startConversation() {
      if (!ai) return;

      try {
        const response = await apiClient.post<StartConversationResponse>(`/chat/${slug}/start`, {});
        setConversationId(response.id);
      } catch {
        setError('Impossible de demarrer la conversation.');
      }
    }

    startConversation();
  }, [ai, slug]);

  const sendMessage = React.useCallback(
    async (content: string) => {
      if (!conversationId || isStreaming) return;

      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const assistantId = `assistant_${Date.now()}`;
      const assistantMessage: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        createdAt: new Date(),
        isStreaming: true,
      };
      setMessages((prev) => [...prev, assistantMessage]);
      setIsStreaming(true);

      abortControllerRef.current?.abort();

      abortControllerRef.current = apiClient.streamMessage(conversationId, content, {
        onToken: (token) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, content: msg.content + token } : msg
            )
          );
        },
        onSources: (sources) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId ? { ...msg, sources: mapSourcesToChat(sources) } : msg
            )
          );
        },
        onDone: (_data: StreamDoneData) => {
          setMessages((prev) =>
            prev.map((msg) => (msg.id === assistantId ? { ...msg, isStreaming: false } : msg))
          );
          setIsStreaming(false);
        },
        onError: () => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: "Desole, une erreur s'est produite.", isStreaming: false }
                : msg
            )
          );
          setIsStreaming(false);
        },
      });
    },
    [conversationId, isStreaming]
  );

  // Cleanup
  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return { ai, messages, isStreaming, isLoading, error, sendMessage };
}
