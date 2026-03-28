'use client';

import * as React from 'react';
import {
  Card,
  ChatInterface,
  ConversationList,
  ConversationListSkeleton,
  type ChatMessage,
  type Conversation,
} from '@corpusai/ui';

interface ChatTabProps {
  messages: ChatMessage[];
  conversations: Conversation[];
  currentConversationId: string | null;
  isLoadingConversations: boolean;
  isStreaming: boolean;
  aiName: string;
  welcomeMessage?: string;
  onSendMessage: (content: string) => void;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
}

/**
 * Chat tab content for the AI detail page.
 * Displays conversation sidebar and chat interface.
 */
export const ChatTab = React.memo(function ChatTab({
  messages,
  conversations,
  currentConversationId,
  isLoadingConversations,
  isStreaming,
  aiName,
  welcomeMessage,
  onSendMessage,
  onSelectConversation,
  onNewConversation,
}: ChatTabProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
      {/* Conversation sidebar */}
      <Card variant="glass" className="flex h-[600px] flex-col overflow-hidden lg:col-span-1">
        {isLoadingConversations ? (
          <ConversationListSkeleton />
        ) : (
          <ConversationList
            conversations={conversations}
            selectedId={currentConversationId || undefined}
            onSelect={onSelectConversation}
            onNewConversation={onNewConversation}
          />
        )}
      </Card>

      {/* Chat interface */}
      <Card variant="glass" className="flex h-[600px] flex-col overflow-hidden lg:col-span-3">
        <ChatInterface
          messages={messages}
          onSendMessage={onSendMessage}
          isLoading={isStreaming}
          welcomeMessage={welcomeMessage}
          aiName={aiName}
          className="flex-1"
        />
      </Card>
    </div>
  );
});
