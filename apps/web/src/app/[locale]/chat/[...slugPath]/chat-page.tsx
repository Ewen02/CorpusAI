'use client';

import * as React from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChatInterface, ChatInterfaceSkeleton, Skeleton, Button, Input } from '@corpusai/ui';
import { usePublicChat } from '@/lib/hooks/use-public-chat';

interface ChatPageProps {
  username: string;
  slug: string;
}

export default function ChatPage({ username, slug }: ChatPageProps) {
  const t = useTranslations('chatPublic');
  const searchParams = useSearchParams();
  const accessToken = searchParams.get('t') ?? undefined;

  const {
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
  } = usePublicChat({ username, slug, accessToken });

  const [accessCode, setAccessCode] = React.useState('');
  const [codeError, setCodeError] = React.useState('');
  const [pendingMessage, setPendingMessage] = React.useState('');

  const handleSendMessage = (content: string) => {
    if (accessDeniedReason === 'access_code') {
      setPendingMessage(content);
    } else {
      sendMessage(content);
    }
  };

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    setCodeError('');
    const ok = await unlockWithCode(accessCode);
    if (ok && pendingMessage) {
      sendMessage(pendingMessage);
      setPendingMessage('');
    }
  };

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

  // Invite-only: show sign-in prompt
  if (accessDeniedReason === 'invite_only') {
    return (
      <PageContainer>
        <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-2xl">
          <div className="space-y-1 text-center">
            <div className="text-3xl">🔐</div>
            <h1 className="text-lg font-semibold">{ai?.name ?? t('thisAssistant')}</h1>
            <p className="text-sm text-muted-foreground">{t('inviteOnly')}</p>
          </div>
          <div className="space-y-3">
            <Link
              href={`/portal/sign-in?callbackUrl=/chat/@${username}/${slug}&aiSlug=${slug}`}
              className="block"
            >
              <Button className="w-full">{t('signInToAccess')}</Button>
            </Link>
            <p className="text-center text-xs text-muted-foreground">{t('inviteHint')}</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  // Hard error (not access_code which has a dedicated modal UI)
  if (error && accessDeniedReason !== 'access_code') {
    return (
      <PageContainer>
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="text-center">
            <div className="mb-4 text-5xl">:(</div>
            <h1 className="mb-2 text-xl font-semibold text-foreground">{t('oops')}</h1>
            <p className="text-muted-foreground">{error}</p>
            <Link href="/" className="mt-6 inline-block text-sm text-primary hover:underline">
              {t('backToHome')}
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

  // Access code modal (shown when accessDeniedReason === 'access_code')
  if (accessDeniedReason === 'access_code') {
    return (
      <PageContainer>
        <div className="w-full max-w-sm space-y-6 rounded-xl border border-border bg-card p-8 shadow-2xl">
          <div className="space-y-1 text-center">
            <div className="text-3xl">🔒</div>
            <h1 className="text-lg font-semibold">{ai.name}</h1>
            <p className="text-sm text-muted-foreground">{t('enterCode')}</p>
          </div>
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <Input
              type="text"
              value={accessCode}
              onChange={(e) => {
                setAccessCode(e.target.value);
                setCodeError('');
              }}
              placeholder={t('accessCode')}
              required
              autoFocus
            />
            {(codeError || isCodeInvalid) && (
              <p className="text-xs text-destructive">{codeError || t('codeInvalid')}</p>
            )}
            <Button type="submit" className="w-full" disabled={isStreaming}>
              {t('access')}
            </Button>
          </form>
        </div>
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

        {showSaveBanner && <SaveBanner onDismiss={dismissSaveBanner} t={t} />}

        <div className="flex-1 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            onFeedback={submitFeedback}
            isLoading={isStreaming}
            welcomeMessage={ai.welcomeMessage ?? t('welcomeMessage', { name: ai.name })}
            aiName={ai.name}
            aiAvatar={ai.avatar ?? undefined}
            placeholder={t('placeholder')}
          />
        </div>
        <PageFooter t={t} />
      </ChatCard>
    </PageContainer>
  );
}

// ============================================
// Sub-components
// ============================================

function SaveBanner({ onDismiss, t }: { onDismiss: () => void; t: (key: string) => string }) {
  return (
    <div className="flex shrink-0 items-center justify-between border-b border-border bg-primary/5 px-4 py-2.5">
      <p className="text-sm text-foreground">
        {t('saveConversation')}{' '}
        <Link href="/portal/sign-in" className="font-medium text-primary hover:underline">
          {t('createFreeAccount')}
        </Link>
      </p>
      <button
        onClick={onDismiss}
        className="ml-4 text-xs text-muted-foreground hover:text-foreground"
      >
        ✕
      </button>
    </div>
  );
}

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

function PageFooter({ t }: { t: (key: string) => string }) {
  return (
    <div className="shrink-0 border-t border-border px-4 py-2.5 text-center">
      <a
        href="https://corpusai.io"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {t('poweredBy')}
      </a>
    </div>
  );
}
