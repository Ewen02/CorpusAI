'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '../atoms/avatar';
import { Skeleton } from '../atoms/skeleton';
import { MarkdownRenderer } from '../molecules/markdown-renderer';

// ============================================
// Types
// ============================================

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
  confidence?: ConfidenceLevel;
  createdAt: Date;
  isStreaming?: boolean;
}

export interface ChatSource {
  documentId: string;
  documentName: string;
  excerpt: string;
  relevanceScore: number;
  pageNumber?: number;
}

export interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  placeholder?: string;
  welcomeMessage?: string;
  aiName?: string;
  aiAvatar?: string;
  userAvatar?: string;
  className?: string;
  onSourceClick?: (source: ChatSource) => void;
}

// ============================================
// Sub-components
// ============================================

interface MessageBubbleProps {
  message: ChatMessage;
  aiName?: string;
  aiAvatar?: string;
  userAvatar?: string;
  onSourceClick?: (source: ChatSource) => void;
}

const MessageBubble = React.memo(function MessageBubble({
  message,
  aiName = 'Assistant',
  aiAvatar,
  userAvatar,
  onSourceClick,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex w-full gap-2.5', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar className="mt-1 h-6 w-6 shrink-0">
        <AvatarImage src={isUser ? userAvatar : aiAvatar} />
        <AvatarFallback
          className={cn(
            'text-[10px] font-medium',
            isUser
              ? 'text-tx-muted bg-[hsl(var(--surface-3))]'
              : 'bg-gradient-to-br from-indigo-400/25 to-indigo-600/15 font-semibold text-[hsl(var(--accent-500))]'
          )}
        >
          {isUser ? 'M' : aiName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn('flex max-w-[78%] flex-col gap-1.5', isUser ? 'items-end' : 'items-start')}
      >
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'text-tx-primary rounded-tr-sm bg-[hsl(var(--accent-500)/0.12)]'
              : 'text-tx-primary rounded-tl-sm bg-[hsl(var(--surface-2))]'
          )}
        >
          {message.isStreaming ? (
            <div className="inline-flex items-start gap-1">
              <MarkdownRenderer content={message.content} />
              <span
                className="text-tx-muted animate-pulse"
                aria-label="Réponse en cours"
                role="status"
              >
                ▊
              </span>
            </div>
          ) : isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>

        {/* Sources as small chips */}
        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {message.sources.map((source, index) => (
              <button
                key={`${source.documentId}-${index}`}
                onClick={() => onSourceClick?.(source)}
                className="text-tx-muted flex items-center gap-1 rounded-full border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-2 py-0.5 text-[11px] transition-colors hover:border-[hsl(var(--accent-500)/0.3)] hover:bg-[hsl(var(--accent-500)/0.06)] hover:text-[hsl(var(--accent-500))] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[hsl(var(--accent-500)/0.5)]"
              >
                <FileIcon className="h-2.5 w-2.5 shrink-0" />
                <span className="max-w-[120px] truncate">{source.documentName}</span>
                {source.pageNumber && (
                  <span className="text-tx-disabled">p.{source.pageNumber}</span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Confidence badge */}
        {!isUser &&
          message.confidence &&
          !message.isStreaming &&
          message.sources &&
          message.sources.length > 0 && (
            <span
              className={cn(
                'rounded-full border px-2 py-0.5 text-[10px] font-medium',
                message.confidence === 'HIGH' &&
                  'border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.08)] text-[hsl(var(--success)/0.8)]',
                message.confidence === 'MEDIUM' &&
                  'border-[hsl(var(--warning)/0.25)] bg-[hsl(var(--warning)/0.08)] text-[hsl(var(--warning)/0.8)]',
                message.confidence === 'LOW' &&
                  'border-[hsl(var(--danger)/0.25)] bg-[hsl(var(--danger)/0.08)] text-[hsl(var(--danger)/0.8)]'
              )}
            >
              {message.confidence === 'HIGH' && '● Confiance élevée'}
              {message.confidence === 'MEDIUM' && '● Confiance moyenne'}
              {message.confidence === 'LOW' && '● Confiance faible'}
            </span>
          )}

        <span className="text-tx-disabled text-[10px]">
          {message.createdAt.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
});

const TypingIndicator = React.memo(function TypingIndicator({
  aiName = 'Assistant',
}: {
  aiName?: string;
}) {
  return (
    <div className="flex w-full gap-2.5">
      <Avatar className="mt-1 h-6 w-6 shrink-0">
        <AvatarFallback className="bg-gradient-to-br from-indigo-400/25 to-indigo-600/15 text-[10px] font-semibold text-[hsl(var(--accent-500))]">
          {aiName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm px-3.5 py-3">
        <span className="bg-tx-muted/40 h-1.5 w-1.5 animate-bounce rounded-full" />
        <span
          className="bg-tx-muted/40 h-1.5 w-1.5 animate-bounce rounded-full"
          style={{ animationDelay: '0.15s' }}
        />
        <span
          className="bg-tx-muted/40 h-1.5 w-1.5 animate-bounce rounded-full"
          style={{ animationDelay: '0.3s' }}
        />
      </div>
    </div>
  );
});

const WelcomeMessage = React.memo(function WelcomeMessage({
  message,
  aiName,
}: {
  message: string;
  aiName?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-16">
      {/* Avatar gradient */}
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 ring-1 ring-[hsl(var(--accent-500)/0.25)]">
        <span className="text-2xl font-bold text-[hsl(var(--accent-500))]">
          {aiName?.charAt(0)?.toUpperCase() || 'A'}
        </span>
      </div>
      <h3 className="text-tx-primary mb-2 text-base font-semibold tracking-tight">
        {aiName || 'Assistant'}
      </h3>
      <p className="text-tx-muted max-w-xs text-center text-[13px] leading-relaxed">{message}</p>

      {/* Footer "Propulsé par" */}
      <div className="text-tx-disabled mt-10 flex items-center gap-2 text-[11px]">
        <div className="h-px w-8 bg-gradient-to-r from-transparent to-[hsl(var(--border-default))]" />
        <span>Propulsé par CorpusAI</span>
        <div className="h-px w-8 bg-gradient-to-l from-transparent to-[hsl(var(--border-default))]" />
      </div>
    </div>
  );
});

// ============================================
// Icons
// ============================================

function SendIcon({ className }: { className?: string }) {
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
      <path d="m22 2-7 20-4-9-9-4Z" />
      <path d="M22 2 11 13" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
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
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

// ============================================
// Main Component
// ============================================

export function ChatInterface({
  messages,
  onSendMessage,
  isLoading = false,
  placeholder = 'Posez votre question...',
  welcomeMessage,
  aiName = 'Assistant',
  aiAvatar,
  userAvatar,
  className,
  onSourceClick,
}: ChatInterfaceProps) {
  const [input, setInput] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Auto-resize textarea
  React.useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed && !isLoading) {
      onSendMessage(trimmed);
      setInput('');
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
      }
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className={cn('flex h-full flex-col', className)}>
      {/* Messages Area */}
      <div className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {messages.length === 0 && welcomeMessage && (
          <WelcomeMessage message={welcomeMessage} aiName={aiName} />
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            aiName={aiName}
            aiAvatar={aiAvatar}
            userAvatar={userAvatar}
            onSourceClick={onSourceClick}
          />
        ))}

        {isLoading && !messages.some((m) => m.isStreaming) && <TypingIndicator aiName={aiName} />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-[hsl(var(--border-subtle))] p-3">
        <form onSubmit={handleSubmit}>
          <div className="flex items-end gap-2 rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] px-3 py-2 transition-colors focus-within:border-[hsl(var(--accent-500)/0.4)] focus-within:ring-1 focus-within:ring-[hsl(var(--accent-500)/0.15)]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              rows={1}
              className="text-tx-primary placeholder:text-tx-disabled flex-1 resize-none bg-transparent text-sm focus:outline-none disabled:opacity-50"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className={cn(
                'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-500)/0.5)]',
                input.trim() && !isLoading
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-[0_2px_8px_hsl(var(--accent-500)/0.35)] hover:opacity-90'
                  : 'text-tx-disabled bg-[hsl(var(--surface-2))]'
              )}
            >
              <SendIcon className="h-3.5 w-3.5" />
              <span className="sr-only">Envoyer</span>
            </button>
          </div>
          <p className="text-tx-disabled mt-1.5 text-center text-[10px]">
            Shift + Entrée pour un saut de ligne
          </p>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Skeleton Loader
// ============================================

export function ChatInterfaceSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-5 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn('flex gap-2.5', i % 2 === 0 && 'flex-row-reverse')}>
            <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
            <Skeleton className={cn('h-14 rounded-2xl', i % 2 === 0 ? 'w-1/3' : 'w-2/3')} />
          </div>
        ))}
      </div>
      <div className="border-t border-[hsl(var(--border-subtle))] p-3">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
