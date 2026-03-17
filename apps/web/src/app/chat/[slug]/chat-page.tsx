'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChatInterface, ChatInterfaceSkeleton, Skeleton } from '@corpusai/ui';
import { usePublicChat } from '@/lib/hooks/use-public-chat';

export default function ChatPage() {
  const params = useParams();
  const slug = params.slug as string;

  const { ai, messages, isStreaming, isLoading, error, sendMessage } = usePublicChat({ slug });

  // Loading state
  if (isLoading) {
    return (
      <PageContainer>
        <ChatCard>
          <ChatHeader />
          <div className="flex-1">
            <ChatInterfaceSkeleton />
          </div>
        </ChatCard>
      </PageContainer>
    );
  }

  // Error state
  if (error) {
    return (
      <PageContainer>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="text-center">
            <div className="mb-4 text-5xl">:(</div>
            <h1 className="mb-2 text-xl font-semibold text-foreground">Oops!</h1>
            <p className="text-muted-foreground">{error}</p>
            <Link href="/" className="mt-6 inline-block text-sm text-primary hover:underline">
              Retour a l&apos;accueil
            </Link>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Waiting state
  if (!ai) {
    return (
      <PageContainer>
        <ChatCard>
          <ChatHeader />
          <div className="flex flex-1 items-center justify-center">
            <Skeleton className="h-8 w-48" />
          </div>
        </ChatCard>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <ChatCard>
        <ChatHeader
          name={ai.name}
          description={ai.description ?? undefined}
          avatar={ai.avatar ?? undefined}
          primaryColor={ai.primaryColor ?? undefined}
        />
        <div className="flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={sendMessage}
            isLoading={isStreaming}
            welcomeMessage={
              ai.welcomeMessage ?? `Bonjour ! Je suis ${ai.name}. Comment puis-je vous aider ?`
            }
            aiName={ai.name}
            aiAvatar={ai.avatar ?? undefined}
            primaryColor={ai.primaryColor ?? undefined}
            placeholder="Posez votre question..."
          />
        </div>
        <PageFooter />
      </ChatCard>
    </PageContainer>
  );
}

// ============================================
// Sub-components
// ============================================

function PageContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      {children}
    </div>
  );
}

function ChatCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
      {children}
    </div>
  );
}

function ChatHeader({
  name,
  description,
  avatar,
  primaryColor,
}: {
  name?: string;
  description?: string;
  avatar?: string;
  primaryColor?: string;
}) {
  return (
    <div
      className="flex shrink-0 items-center gap-3 border-b border-border px-5 py-4"
      style={primaryColor ? { borderBottomColor: primaryColor } : undefined}
    >
      {avatar ? (
        <Image
          src={avatar}
          alt={name || 'Assistant'}
          width={40}
          height={40}
          className="h-10 w-10 rounded-full object-cover"
        />
      ) : (
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          style={primaryColor ? { backgroundColor: primaryColor } : undefined}
        >
          {name?.charAt(0).toUpperCase() || 'A'}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold text-foreground">{name || 'Assistant'}</h1>
        {description && <p className="truncate text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}

function PageFooter() {
  return (
    <div className="shrink-0 border-t border-border px-4 py-2.5 text-center">
      <a
        href="https://corpusai.io"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        Propulse par CorpusAI
      </a>
    </div>
  );
}
