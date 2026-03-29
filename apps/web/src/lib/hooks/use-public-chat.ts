'use client';

import * as React from 'react';
import { apiClient, ApiError, type StreamDoneData } from '@/lib/api-client';
import type { ChatMessage } from '@corpusai/ui';
import type { AIPublicInfo, StartConversationResponse } from '@corpusai/types';
import { mapSourcesToChat } from '@/lib/utils/chat-session';

export { getOrCreateSessionId, mapSourcesToChat } from '@/lib/utils/chat-session';

// ============================================
// Types
// ============================================

export type AccessDeniedReason = 'access_token' | 'access_code' | 'invite_only' | 'ai_inactive';

interface UsePublicChatOptions {
  username: string;
  slug: string;
  /** Secret token from URL ?t= param */
  accessToken?: string;
}

interface UsePublicChatReturn {
  ai: AIPublicInfo | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  isLoading: boolean;
  error: string | null;
  accessDeniedReason: AccessDeniedReason | null;
  isCodeInvalid: boolean;
  showSaveBanner: boolean;
  unlockWithCode: (code: string) => Promise<boolean>;
  sendMessage: (content: string) => void;
  dismissSaveBanner: () => void;
}

// ============================================
// Hook
// ============================================

export function usePublicChat({
  username,
  slug,
  accessToken,
}: UsePublicChatOptions): UsePublicChatReturn {
  const [ai, setAI] = React.useState<AIPublicInfo | null>(null);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [accessDeniedReason, setAccessDeniedReason] = React.useState<AccessDeniedReason | null>(
    null
  );
  const [isCodeInvalid, setIsCodeInvalid] = React.useState(false);
  const [sentMessageCount, setSentMessageCount] = React.useState(0);
  const [showSaveBanner, setShowSaveBanner] = React.useState(false);
  const [bannerDismissed, setBannerDismissed] = React.useState(false);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Show save banner after 3 messages (if no eu_session cookie)
  React.useEffect(() => {
    if (sentMessageCount >= 3 && !bannerDismissed) {
      // Check if eu_session cookie is present (can't read httpOnly from JS — rely on count only)
      setShowSaveBanner(true);
    }
  }, [sentMessageCount, bannerDismissed]);

  // Fetch AI info
  React.useEffect(() => {
    async function fetchAI() {
      try {
        const data = await apiClient.get<AIPublicInfo>(`/chat/${username}/${slug}/info`);
        setAI(data);
      } catch {
        setError('Assistant introuvable.');
      } finally {
        setIsLoading(false);
      }
    }

    if (username && slug) fetchAI();
  }, [username, slug]);

  // Start conversation
  React.useEffect(() => {
    async function startConversation() {
      if (!ai) return;

      try {
        const headers: Record<string, string> = { 'x-conversation-source': 'PUBLIC' };
        if (accessToken) headers['x-access-token'] = accessToken;

        const response = await apiClient.post<StartConversationResponse>(
          `/chat/${username}/${slug}/start`,
          undefined,
          { headers }
        );
        setConversationId(response.id);
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const reason = (err.data as { reason?: string } | undefined)?.reason as
            | AccessDeniedReason
            | undefined;
          setAccessDeniedReason(reason ?? null);
          if (reason === 'access_code') {
            // Don't set error — caller shows modal
            setIsLoading(false);
          } else if (reason === 'access_token') {
            setError('Lien invalide ou expiré.');
          } else if (reason === 'invite_only') {
            setError('Accès sur invitation uniquement.');
          } else {
            setError('Accès refusé.');
          }
        } else {
          setError('Impossible de démarrer la conversation.');
        }
        setIsLoading(false);
      }
    }

    if (ai) startConversation();
  }, [ai, username, slug, accessToken]);

  const unlockWithCode = React.useCallback(
    async (code: string): Promise<boolean> => {
      if (!ai) return false;
      setIsCodeInvalid(false);
      try {
        const headers: Record<string, string> = {
          'x-conversation-source': 'PUBLIC',
          'x-access-code': code,
        };
        if (accessToken) headers['x-access-token'] = accessToken;
        const response = await apiClient.post<StartConversationResponse>(
          `/chat/${username}/${slug}/start`,
          undefined,
          { headers }
        );
        setConversationId(response.id);
        setAccessDeniedReason(null);
        return true;
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          const reason = (err.data as { reason?: string } | undefined)?.reason as
            | AccessDeniedReason
            | undefined;
          if (reason === 'access_code') setIsCodeInvalid(true);
          setAccessDeniedReason(reason ?? 'access_code');
        }
        return false;
      }
    },
    [ai, username, slug, accessToken]
  );

  const sendMessage = React.useCallback(
    async (content: string) => {
      if (!conversationId) return;
      if (isStreaming) return;

      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      const assistantId = `assistant_${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          content: '',
          createdAt: new Date(),
          isStreaming: true,
        },
      ]);
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
          setSentMessageCount((c) => c + 1);
        },
        onError: () => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? { ...msg, content: "Désolé, une erreur s'est produite.", isStreaming: false }
                : msg
            )
          );
          setIsStreaming(false);
        },
      });
    },
    [conversationId, isStreaming]
  );

  const dismissSaveBanner = React.useCallback(() => {
    setShowSaveBanner(false);
    setBannerDismissed(true);
  }, []);

  // Cleanup
  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  return {
    ai,
    messages,
    isStreaming,
    isLoading,
    error,
    accessDeniedReason,
    isCodeInvalid,
    showSaveBanner,
    unlockWithCode,
    sendMessage,
    dismissSaveBanner,
  };
}
