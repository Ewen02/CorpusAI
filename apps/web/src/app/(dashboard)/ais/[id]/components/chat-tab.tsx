'use client';

import * as React from 'react';
import {
  Card,
  ChatInterface,
  ConversationList,
  ConversationListSkeleton,
  type ChatMessage,
  type ChatSource,
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
  primaryColor?: string;
  onSendMessage: (content: string) => void;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onSourceClick?: (source: ChatSource) => void;
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
  primaryColor,
  onSendMessage,
  onSelectConversation,
  onNewConversation,
  onSourceClick,
}: ChatTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Conversation sidebar */}
      <Card variant="glass" className="lg:col-span-1 h-[600px] flex flex-col overflow-hidden">
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
      <Card variant="glass" className="lg:col-span-3 h-[600px] flex flex-col overflow-hidden">
        <ChatInterface
          messages={messages}
          onSendMessage={onSendMessage}
          isLoading={isStreaming}
          welcomeMessage={welcomeMessage}
          aiName={aiName}
          primaryColor={primaryColor}
          onSourceClick={onSourceClick}
          className="flex-1"
        />
      </Card>
    </div>
  );
});
