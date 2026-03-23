'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from '../atoms/button';
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
}

function ConversationItem({
  conversation,
  isSelected,
  onClick,
  onDelete,
  aiName = 'Assistant',
}: ConversationItemProps) {
  const title = conversation.title || 'Nouvelle conversation';
  const preview = conversation.lastMessage
    ? truncateText(conversation.lastMessage, 55)
    : 'Aucun message';
  const initial = aiName.charAt(0).toUpperCase();

  return (
    <div
      className={cn(
        'group relative flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-all duration-150',
        isSelected
          ? 'border border-[hsl(var(--accent-500)/0.2)] bg-[hsl(var(--accent-500)/0.08)] shadow-[inset_2px_0_0_hsl(var(--accent-500))]'
          : 'border border-transparent hover:border-[hsl(var(--border-default))] hover:bg-[hsl(var(--surface-2))]'
      )}
      onClick={onClick}
    >
      {/* Avatar initiale gradient */}
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[12px] font-semibold',
          isSelected
            ? 'bg-gradient-to-br from-indigo-400/25 to-indigo-600/15 text-[hsl(var(--accent-500))] ring-1 ring-[hsl(var(--accent-500)/0.3)]'
            : 'text-tx-muted bg-[hsl(var(--surface-2))] ring-1 ring-[hsl(var(--border-default))]'
        )}
      >
        {initial}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h3
            className={cn(
              'truncate text-[13px] font-medium',
              isSelected ? 'text-tx-primary' : 'text-tx-secondary'
            )}
          >
            {title}
          </h3>
          <span className="text-tx-disabled shrink-0 text-[10px]">
            {formatRelativeTime(conversation.updatedAt)}
          </span>
        </div>

        <p className="text-tx-disabled mt-0.5 line-clamp-1 text-[12px]">{preview}</p>

        <div className="text-tx-disabled mt-1.5 flex items-center gap-1.5 text-[11px]">
          <MessageIcon className="h-3 w-3" />
          {conversation.messageCount}
        </div>
      </div>

      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 h-6 w-6 opacity-0 transition-opacity hover:bg-[hsl(var(--danger)/0.1)] hover:text-[hsl(var(--danger))] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-500)/0.5)] group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label="Supprimer la conversation"
        >
          <TrashIcon className="h-3 w-3" />
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
  className,
}: ConversationListProps) {
  if (isLoading) {
    return <ConversationListSkeleton />;
  }

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Header */}
      <div className="border-b border-[hsl(var(--border-subtle))] px-3 py-3">
        <div className="flex items-center justify-between">
          <h2 className="text-tx-disabled text-[12px] font-semibold uppercase tracking-wide">
            Conversations
          </h2>
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              className="text-tx-muted flex items-center gap-1 rounded-md px-2 py-1 text-[12px] font-medium transition-all hover:bg-[hsl(var(--accent-500)/0.08)] hover:text-[hsl(var(--accent-500))]"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              Nouvelle
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-2">
        {conversations.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-4 text-center">
            <div className="to-indigo-600/8 mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400/15 ring-1 ring-[hsl(var(--accent-500)/0.2)]">
              <MessageIcon className="h-5 w-5 text-indigo-400/70" />
            </div>
            <p className="text-tx-secondary mb-1 text-[13px] font-medium">Aucune conversation</p>
            <p className="text-tx-disabled mb-4 text-[12px]">Posez votre première question</p>
            {onNewConversation && (
              <button
                onClick={onNewConversation}
                className="rounded-md bg-[hsl(var(--accent-500)/0.1)] px-3 py-1.5 text-[12px] font-medium text-[hsl(var(--accent-500))] hover:bg-[hsl(var(--accent-500)/0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-500)/0.5)]"
              >
                Démarrer
              </button>
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
    <div className="flex h-full flex-col">
      <div className="border-b border-[hsl(var(--border-subtle))] px-3 py-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-20 rounded-md" />
        </div>
      </div>
      <div className="flex-1 space-y-1 p-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-start gap-3 rounded-lg p-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
