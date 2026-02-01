'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ChatInterface, ChatInterfaceSkeleton, Skeleton } from '@corpusai/ui';
import type { ChatMessage, ChatSource } from '@corpusai/ui';
import { apiClient, type MessageSource, type StreamDoneData } from '@/lib/api-client';
import type { AIPublicInfo, StartConversationResponse } from '@corpusai/types';

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

function useEmbedConfig(): EmbedConfig {
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
    };
  }, [searchParams]);
}

// ============================================
// Helpers
// ============================================

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function getOrCreateSessionId(): string {
  if (typeof window === 'undefined') return generateSessionId();

  try {
    let sessionId = sessionStorage.getItem('corpusai_session_id');
    if (!sessionId) {
      sessionId = generateSessionId();
      sessionStorage.setItem('corpusai_session_id', sessionId);
    }
    return sessionId;
  } catch {
    // SecurityError in private browsing or restricted environments
    return generateSessionId();
  }
}

function mapSourcesToChat(sources: MessageSource[]): ChatSource[] {
  return sources.map((source) => ({
    documentId: source.chunkId || '',
    documentName: source.documentSource || 'Document',
    excerpt: source.excerpt || '',
    relevanceScore: source.score || 0,
  }));
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

        if (!data.isPublic) {
          setError("Cet assistant n'est pas accessible publiquement.");
          return;
        }

        if (data.status !== 'ACTIVE') {
          setError("Cet assistant n'est pas disponible actuellement.");
          return;
        }

        setAI(data);
      } catch (err) {
        console.error('Failed to fetch AI:', err);
        setError("Assistant introuvable.");
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
        const sessionId = getOrCreateSessionId();
        const response = await apiClient.post<StartConversationResponse>(
          `/chat/${slug}/start`,
          {},
        );
        setConversationId(response.id);
      } catch (err) {
        console.error('Failed to start conversation:', err);
        setError("Impossible de démarrer la conversation.");
      }
    }

    startConversation();
  }, [ai, slug]);

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
      abortControllerRef.current = apiClient.streamMessage(
        conversationId,
        content,
        {
          onToken: (token) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: msg.content + token }
                  : msg
              )
            );
          },
          onSources: (sources) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, sources: mapSourcesToChat(sources) }
                  : msg
              )
            );
          },
          onDone: (_data: StreamDoneData) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId ? { ...msg, isStreaming: false } : msg
              )
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
        }
      );
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
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="text-4xl mb-4">:(</div>
            <h1 className="text-xl font-semibold mb-2">Oops!</h1>
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
        <div className="flex-1 flex items-center justify-center">
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
          welcomeMessage={ai.welcomeMessage ?? `Bonjour ! Je suis ${ai.name}. Comment puis-je vous aider ?`}
          aiName={ai.name}
          aiAvatar={ai.avatar ?? undefined}
          primaryColor={effectivePrimaryColor}
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
    <div
      className={`flex flex-col bg-background text-foreground ${theme}`}
      style={{ height }}
    >
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
      className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0"
      style={primaryColor ? { borderBottomColor: primaryColor } : undefined}
    >
      {avatar ? (
        <img
          src={avatar}
          alt={name || 'Assistant'}
          className="h-8 w-8 rounded-full object-cover"
        />
      ) : (
        <div
          className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium"
          style={primaryColor ? { backgroundColor: primaryColor } : undefined}
        >
          {name?.charAt(0).toUpperCase() || 'A'}
        </div>
      )}
      <div>
        <h1 className="font-semibold text-sm">{name || 'Assistant'}</h1>
        <p className="text-xs text-muted-foreground">Propulsé par CorpusAI</p>
      </div>
    </div>
  );
}

function EmbedFooter() {
  return (
    <div className="px-4 py-2 text-center border-t border-border shrink-0">
      <a
        href="https://corpusai.io"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        Propulsé par CorpusAI
      </a>
    </div>
  );
}
