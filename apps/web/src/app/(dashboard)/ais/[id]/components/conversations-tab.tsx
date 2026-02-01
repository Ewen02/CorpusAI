'use client';

import * as React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  ConversationList,
  ConversationListSkeleton,
  ChatIcon,
  type Conversation,
} from '@corpusai/ui';

interface ConversationsTabProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
}

/**
 * Conversations history tab content for the AI detail page.
 */
export const ConversationsTab = React.memo(function ConversationsTab({
  conversations,
  currentConversationId,
  isLoading,
  onSelectConversation,
  onNewConversation,
}: ConversationsTabProps) {
  if (isLoading) {
    return <ConversationListSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historique des conversations</CardTitle>
        <CardDescription>{conversations.length} conversation(s)</CardDescription>
      </CardHeader>
      <CardContent>
        {conversations.length === 0 ? (
          <EmptyConversationsState />
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={currentConversationId || undefined}
            onSelect={onSelectConversation}
            onNewConversation={onNewConversation}
          />
        )}
      </CardContent>
    </Card>
  );
});

/**
 * Empty state for conversations list.
 */
const EmptyConversationsState = React.memo(function EmptyConversationsState() {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <ChatIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
      <p>Aucune conversation</p>
      <p className="text-sm">Les conversations apparaitront ici.</p>
    </div>
  );
});
