'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from '../atoms/button';
import { Avatar, AvatarFallback, AvatarImage } from '../atoms/avatar';
import { Skeleton } from '../atoms/skeleton';

// ============================================
// Types
// ============================================

export interface Conversation {
  id: string;
  title: string | null;
  lastMessage: string | null;
  messageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationListProps {
  conversations: Conversation[];
  selectedId?: string;
  onSelect: (conversation: Conversation) => void;
  onNewConversation?: () => void;
  onDelete?: (conversationId: string) => void;
  isLoading?: boolean;
  aiName?: string;
  aiAvatar?: string;
  className?: string;
}

// ============================================
// Helpers
// ============================================

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `${diffMins}min`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim() + '...';
}

// ============================================
// Sub-components
// ============================================

interface ConversationItemProps {
  conversation: Conversation;
  isSelected: boolean;
  onClick: () => void;
  onDelete?: () => void;
  aiName?: string;
  aiAvatar?: string;
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
  onDelete,
  aiName = 'Assistant',
  aiAvatar,
}: ConversationItemProps) {
  const [showDelete, setShowDelete] = React.useState(false);

  const title = conversation.title || 'Nouvelle conversation';
  const preview = conversation.lastMessage
    ? truncateText(conversation.lastMessage, 60)
    : 'Aucun message';

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
        isSelected
          ? 'bg-primary/10 border border-primary/20 shadow-sm'
          : 'border border-transparent hover:bg-white/[0.04] hover:border-white/[0.06]'
      )}
      onClick={onClick}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={() => setShowDelete(false)}
    >
      <Avatar className={cn(
        'h-9 w-9 shrink-0 ring-2',
        isSelected ? 'ring-primary/30' : 'ring-white/[0.06]'
      )}>
        <AvatarImage src={aiAvatar} />
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          {aiName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <h3 className={cn(
            'text-sm font-medium truncate',
            isSelected && 'text-primary'
          )}>{title}</h3>
          <span className="text-[11px] text-muted-foreground/60 shrink-0">
            {formatRelativeTime(conversation.updatedAt)}
          </span>
        </div>

        <p className="text-xs text-muted-foreground/70 mt-0.5 line-clamp-2">
          {preview}
        </p>

        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px] text-muted-foreground/50 flex items-center gap-1">
            <MessageIcon className="h-3 w-3" />
            {conversation.messageCount}
          </span>
        </div>
      </div>

      {onDelete && showDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <TrashIcon className="h-3 w-3" />
          <span className="sr-only">Supprimer</span>
        </Button>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewConversation,
  onDelete,
  isLoading = false,
  aiName,
  aiAvatar,
  className,
}: ConversationListProps) {
  if (isLoading) {
    return <ConversationListSkeleton />;
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Conversations</h2>
          {onNewConversation && (
            <Button variant="ghost" size="sm" onClick={onNewConversation} className="h-8 gap-1.5 text-xs hover:bg-primary/10 hover:text-primary">
              <PlusIcon className="h-3.5 w-3.5" />
              Nouvelle
            </Button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3 ring-1 ring-primary/20">
              <MessageIcon className="h-5 w-5 text-primary/60" />
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              Aucune conversation
            </p>
            <p className="text-xs text-muted-foreground/50 mb-4">
              Posez votre première question
            </p>
            {onNewConversation && (
              <Button
                variant="outline"
                size="sm"
                className="border-primary/20 hover:bg-primary/10 hover:text-primary"
                onClick={onNewConversation}
              >
                Démarrer
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={conversation.id === selectedId}
                onClick={() => onSelect(conversation)}
                onDelete={onDelete ? () => onDelete(conversation.id) : undefined}
                aiName={aiName}
                aiAvatar={aiAvatar}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Icons
// ============================================

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
    </svg>
  );
}

// ============================================
// Skeleton Loader
// ============================================

export function ConversationListSkeleton() {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
      <div className="flex-1 p-2 space-y-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg">
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
