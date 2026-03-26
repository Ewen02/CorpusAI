'use client';

import * as React from 'react';
import Image from 'next/image';
import { useParams, useSearchParams } from 'next/navigation';
import { ChatInterface, ChatInterfaceSkeleton, Skeleton } from '@corpusai/ui';
import type { ChatMessage } from '@corpusai/ui';
import { apiClient, type StreamDoneData } from '@/lib/api-client';
import type { AIPublicInfo, StartConversationResponse } from '@corpusai/types';
import { getOrCreateSessionId, mapSourcesToChat } from '@/lib/utils/chat-session';

// ============================================
// Types
// ============================================

interface EmbedConfig {
  theme: 'light' | 'dark' | 'system';
  height: string;
  hideHeader: boolean;
  hideFooter: boolean;
  primaryColor?: string;
}

// ============================================
// Hooks
// ============================================

function useEmbedConfig(): EmbedConfig & { accessToken?: string; accessCode?: string } {
  const searchParams = useSearchParams();

  return React.useMemo(() => {
    const theme = searchParams.get('theme');
    const height = searchParams.get('height');
    const hideHeader = searchParams.get('hideHeader');
    const hideFooter = searchParams.get('hideFooter');
    const primaryColor = searchParams.get('color');

    return {
      theme: theme === 'light' || theme === 'dark' ? theme : 'system',
      height: height || '100vh',
      hideHeader: hideHeader === 'true' || hideHeader === '1',
      hideFooter: hideFooter === 'true' || hideFooter === '1',
      primaryColor: primaryColor || undefined,
      accessToken: searchParams.get('token') ?? undefined,
      accessCode: searchParams.get('code') ?? undefined,
    };
  }, [searchParams]);
}

// ============================================
// Main Component
// ============================================

export default function EmbedPage() {
  const params = useParams();
  const slug = params.slug as string;
  const config = useEmbedConfig();

  const [ai, setAI] = React.useState<AIPublicInfo | null>(null);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const abortControllerRef = React.useRef<AbortController | null>(null);

  // Fetch AI info on mount
  React.useEffect(() => {
    async function fetchAI() {
      try {
        const data = await apiClient.get<AIPublicInfo>(`/chat/${slug}/info`);

        setAI(data);
      } catch (err) {
        console.error('Failed to fetch AI:', err);
        setError('Assistant introuvable.');
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) {
      fetchAI();
    }
  }, [slug]);

  // Start conversation when AI is loaded
  React.useEffect(() => {
    async function startConversation() {
      if (!ai) return;

      try {
        const headers: Record<string, string> = { 'x-conversation-source': 'WIDGET' };
        if (config.accessToken) headers['x-access-token'] = config.accessToken;
        if (config.accessCode) headers['x-access-code'] = config.accessCode;

        const response = await apiClient.post<StartConversationResponse>(
          `/chat/${slug}/start`,
          undefined,
          { headers }
        );
        setConversationId(response.id);
      } catch (err) {
        console.error('Failed to start conversation:', err);
        setError('Impossible de démarrer la conversation.');
      }
    }

    startConversation();
  }, [ai, slug, config.accessToken, config.accessCode]);

  const handleSendMessage = React.useCallback(
    async (content: string) => {
      if (!conversationId || isStreaming) return;

      // Add user message
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}`,
        role: 'user',
        content,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add placeholder assistant message
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

      // Cancel any existing stream
      abortControllerRef.current?.abort();

      // Stream the response
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
        onError: (err) => {
          console.error('Stream error:', err);
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === assistantId
                ? {
                    ...msg,
                    content: "Désolé, une erreur s'est produite.",
                    isStreaming: false,
                  }
                : msg
            )
          );
          setIsStreaming(false);
        },
      });
    },
    [conversationId, isStreaming]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Determine the effective primary color (URL param overrides AI setting)
  const effectivePrimaryColor = config.primaryColor || ai?.primaryColor;

  // Theme class for the container
  const themeClass = config.theme === 'light' ? 'light' : config.theme === 'dark' ? 'dark' : '';

  // Loading state
  if (isLoading) {
    return (
      <EmbedContainer height={config.height} theme={themeClass}>
        {!config.hideHeader && <EmbedHeader />}
        <div className="flex-1">
          <ChatInterfaceSkeleton />
        </div>
        {!config.hideFooter && <EmbedFooter />}
      </EmbedContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <EmbedContainer height={config.height} theme={themeClass}>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="text-center">
            <div className="mb-4 text-4xl">:(</div>
            <h1 className="mb-2 text-xl font-semibold">Oops!</h1>
            <p className="text-muted-foreground">{error}</p>
          </div>
        </div>
      </EmbedContainer>
    );
  }

  // Waiting for conversation
  if (!ai || !conversationId) {
    return (
      <EmbedContainer height={config.height} theme={themeClass}>
        {!config.hideHeader && <EmbedHeader name={ai?.name} primaryColor={effectivePrimaryColor} />}
        <div className="flex flex-1 items-center justify-center">
          <Skeleton className="h-8 w-48" />
        </div>
        {!config.hideFooter && <EmbedFooter />}
      </EmbedContainer>
    );
  }

  return (
    <EmbedContainer height={config.height} theme={themeClass}>
      {!config.hideHeader && (
        <EmbedHeader
          name={ai.name}
          avatar={ai.avatar ?? undefined}
          primaryColor={effectivePrimaryColor}
        />
      )}
      <div className="flex-1 overflow-hidden">
        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          isLoading={isStreaming}
          welcomeMessage={
            ai.welcomeMessage ?? `Bonjour ! Je suis ${ai.name}. Comment puis-je vous aider ?`
          }
          aiName={ai.name}
          aiAvatar={ai.avatar ?? undefined}
          placeholder="Posez votre question..."
        />
      </div>
      {!config.hideFooter && <EmbedFooter />}
    </EmbedContainer>
  );
}

// ============================================
// Sub-components
// ============================================

function EmbedContainer({
  children,
  height,
  theme,
}: {
  children: React.ReactNode;
  height: string;
  theme: string;
}) {
  return (
    <div className={`flex flex-col bg-background text-foreground ${theme}`} style={{ height }}>
      {children}
    </div>
  );
}

function EmbedHeader({
  name,
  avatar,
  primaryColor,
}: {
  name?: string;
  avatar?: string;
  primaryColor?: string;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-3 border-b border-border px-4 py-3"
      style={primaryColor ? { borderBottomColor: primaryColor } : undefined}
    >
      {avatar ? (
        <Image
          src={avatar}
          alt={name || 'Assistant'}
          width={32}
          height={32}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground"
          style={primaryColor ? { backgroundColor: primaryColor } : undefined}
        >
          {name?.charAt(0).toUpperCase() || 'A'}
        </div>
      )}
      <div>
        <h1 className="text-sm font-semibold">{name || 'Assistant'}</h1>
        <p className="text-xs text-muted-foreground">Powered by CorpusAI</p>
      </div>
    </div>
  );
}

function EmbedFooter() {
  return (
    <div className="shrink-0 border-t border-border px-4 py-2 text-center">
      <a
        href="https://corpusai.io"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        Powered by CorpusAI
      </a>
    </div>
  );
}
