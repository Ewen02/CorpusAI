'use client';

import * as React from 'react';
import {
  ConversationList,
  ConversationListSkeleton,
  Skeleton,
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
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <ConversationListSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{conversations.length} conversation(s)</p>
      <ConversationList
        conversations={conversations}
        selectedId={currentConversationId || undefined}
        onSelect={onSelectConversation}
        onNewConversation={onNewConversation}
        className="rounded-lg border bg-card"
      />
    </div>
  );
});
