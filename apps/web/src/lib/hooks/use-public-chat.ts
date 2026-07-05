'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { apiClient, ApiError, type StreamDoneData } from '@/lib/api-client';
import type { ChatMessage } from '@corpusai/ui';
import type { AIPublicInfo, StartConversationResponse } from '@corpusai/types';
import { mapSourcesToChat } from '@/lib/utils/chat-session';
import { track } from '@/lib/analytics';
import { reportError } from '@/lib/log';

const FIRST_CHAT_FLAG_KEY = 'corpusai:first_chat_sent';

function markFirstChatIfNeeded(source: 'dashboard' | 'public' | 'widget') {
  if (typeof window === 'undefined') return;
  try {
    if (window.localStorage.getItem(FIRST_CHAT_FLAG_KEY)) return;
    window.localStorage.setItem(FIRST_CHAT_FLAG_KEY, '1');
    track('first_chat_message_sent', { source });
  } catch {
    // localStorage disabled — skip silently
  }
}

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
  submitFeedback: (messageId: string, feedback: 'positive' | 'negative') => void;
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
  const t = useTranslations('chatPublic');
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
        setError(t('notFound'));
      } finally {
        setIsLoading(false);
      }
    }

    if (username && slug) fetchAI();
  }, [username, slug, t]);

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
            setError(t('invalidLink'));
          } else if (reason === 'invite_only') {
            setError(t('inviteOnly'));
          } else {
            setError(t('accessDenied'));
          }
        } else {
          setError(t('startError'));
        }
        setIsLoading(false);
      }
    }

    if (ai) startConversation();
  }, [ai, username, slug, accessToken, t]);

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

      // Analytics: public/widget chat engagement. We can't tell dashboard vs
      // public vs widget from this hook alone — `usePublicChat` is used by
      // both `/chat/@user/slug` and the embed widget. Check the URL path.
      const path = typeof window !== 'undefined' ? window.location.pathname : '';
      const chatSource = path.includes('/embed/') ? 'widget' : 'public';
      track('chat_message_sent', { source: chatSource, aiId: slug });
      markFirstChatIfNeeded(chatSource);

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
          const realUserMsgId = _data.userMessage?.id;
          const realAssistantMsgId = _data.assistantMessage?.id;
          setMessages((prev) =>
            prev.map((msg) => {
              if (msg.id === userMessage.id && realUserMsgId) {
                return { ...msg, id: realUserMsgId };
              }
              if (msg.id === assistantId) {
                return {
                  ...msg,
                  id: realAssistantMsgId || msg.id,
                  isStreaming: false,
                  feedback: _data.assistantMessage?.feedback ?? null,
                };
              }
              return msg;
            })
          );
          setIsStreaming(false);
          setSentMessageCount((c) => c + 1);
        },
        onError: (error) => {
          const msg = error instanceof Error ? error.message : '';
          const isRateLimit = msg.includes('limit');
          const errorContent = isRateLimit ? t('rateLimitReached') : t('streamError');
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: errorContent, isStreaming: false } : m
            )
          );
          setIsStreaming(false);
        },
      });
    },
    [conversationId, isStreaming, t]
  );

  const submitFeedback = React.useCallback(
    async (messageId: string, feedback: 'positive' | 'negative') => {
      if (!conversationId) return;
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, feedback } : msg)));
      track('feedback_submitted', { value: feedback });
      try {
        await apiClient.patch(
          `/chat/conversations/${conversationId}/messages/${messageId}/feedback`,
          { feedback }
        );
      } catch (err) {
        reportError('Failed to submit feedback', err);
      }
    },
    [conversationId]
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
    submitFeedback,
    dismissSaveBanner,
  };
}
