'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button, Card, CardContent, Skeleton } from '@corpusai/ui';
import { usePortalConversation } from '@/lib/queries';

export default function PortalConversationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;
  const { data: conversation, isLoading } = usePortalConversation(conversationId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border px-6 py-4">
          <div className="mx-auto flex max-w-2xl items-center gap-3">
            <Skeleton className="h-8 w-8 rounded" />
            <Skeleton className="h-5 w-48" />
          </div>
        </header>
        <main className="mx-auto max-w-2xl space-y-4 px-6 py-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className={`h-16 rounded-lg ${i % 2 === 0 ? 'ml-8' : 'mr-8'}`} />
          ))}
        </main>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm">
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Conversation introuvable</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/portal/conversations')}
            >
              Retour
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/portal/conversations')}
            className="h-8 w-8 p-0"
          >
            ←
          </Button>
          <div>
            <h1 className="text-sm font-medium">
              {conversation.title || 'Conversation sans titre'}
            </h1>
            <p className="text-xs text-muted-foreground">{conversation.ai.name}</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-6 py-8">
        {conversation.messages.map((msg) => {
          const isUser = msg.role === 'USER';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-lg px-4 py-3 text-sm ${
                  isUser ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                }`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}

        {conversation.messages.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-sm text-muted-foreground">Aucun message dans cette conversation</p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
