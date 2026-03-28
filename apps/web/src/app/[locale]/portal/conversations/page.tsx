'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle, Button, Skeleton, Badge } from '@corpusai/ui';
import { useRouter } from '@/i18n/routing';
import { usePortalConversations, usePortalSignOut } from '@/lib/queries';

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function PortalConversationsPage() {
  const t = useTranslations('portal.conversations');
  const router = useRouter();
  const { data: conversations, isLoading } = usePortalConversations();
  const { mutate: signOut, isPending: isSigningOut } = usePortalSignOut();

  // After login, redirect to original destination if one was stored
  React.useEffect(() => {
    const callbackUrl = sessionStorage.getItem('portal_callback_url');
    if (callbackUrl) {
      sessionStorage.removeItem('portal_callback_url');
      router.replace(callbackUrl);
    }
  }, [router]);

  const handleSignOut = () => {
    signOut(undefined, {
      onSuccess: () => {
        window.location.href = '/portal/sign-in';
      },
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-semibold">{t('title')}</h1>
          <Button variant="ghost" size="sm" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? t('signingOut') : t('signOut')}
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-8">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('empty')}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t('emptyDescription')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {conversations.map((conv) => (
              <Card
                key={conv.id}
                className="cursor-pointer transition-colors hover:bg-accent/50"
                onClick={() => router.push(`/portal/conversations/${conv.id}`)}
              >
                <CardHeader className="pb-2 pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-sm font-medium">
                      {conv.title || t('untitled')}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className="shrink-0 text-xs"
                      style={{
                        backgroundColor: conv.ai.primaryColor + '20',
                        color: conv.ai.primaryColor,
                      }}
                    >
                      {conv.ai.name}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="pb-4 pt-0">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                      {conv.messageCount} message{conv.messageCount > 1 ? 's' : ''}
                    </span>
                    <span>·</span>
                    <span>{formatDate(conv.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
