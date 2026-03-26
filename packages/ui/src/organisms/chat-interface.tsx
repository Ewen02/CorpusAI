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
}

// ============================================
// Sub-components
// ============================================

interface MessageBubbleProps {
  message: ChatMessage;
  aiName?: string;
  aiAvatar?: string;
  userAvatar?: string;
}

const MessageBubble = React.memo(function MessageBubble({
  message,
  aiName = 'Assistant',
  aiAvatar,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const formattedTime = message.createdAt.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isUser) {
    return (
      <div className="group relative flex justify-end pb-5">
        <div className="text-tx-primary max-w-[75%] rounded-2xl rounded-tr-sm bg-[hsl(var(--accent-500)/0.12)] px-3.5 py-2.5 text-sm leading-relaxed">
          <span className="whitespace-pre-wrap">{message.content}</span>
        </div>
        <span className="text-tx-disabled absolute bottom-0 right-0 text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
          {formattedTime}
        </span>
      </div>
    );
  }

  return (
    <div className="group relative flex gap-3 pb-5">
      <Avatar className="mt-0.5 h-6 w-6 shrink-0">
        <AvatarImage src={aiAvatar} />
        <AvatarFallback className="bg-gradient-to-br from-indigo-400/25 to-indigo-600/15 text-[10px] font-semibold text-[hsl(var(--accent-500))]">
          {aiName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="text-tx-primary text-sm leading-relaxed">
          {message.isStreaming ? (
            <div className="inline">
              <MarkdownRenderer content={message.content} />
              <span
                className="cursor-blink ml-0.5 inline-block h-[1em] w-0.5 translate-y-0.5 rounded-sm bg-[hsl(var(--accent-400))] align-middle"
                aria-label="Réponse en cours"
                role="status"
              />
            </div>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>
      </div>

      <span className="text-tx-disabled absolute bottom-0 left-9 text-[10px] opacity-0 transition-opacity group-hover:opacity-100">
        {formattedTime}
      </span>
    </div>
  );
});

const TypingIndicator = React.memo(function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 h-6 w-6 shrink-0" />
      <div className="flex items-center gap-1 py-3 pl-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="typing-wave bg-tx-muted/50 h-1.5 w-1.5 rounded-full"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
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
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 ring-1 ring-[hsl(var(--accent-500)/0.25)]">
        <span className="text-2xl font-bold text-[hsl(var(--accent-500))]">
          {aiName?.charAt(0)?.toUpperCase() || 'A'}
        </span>
      </div>
      <h3 className="text-tx-primary mb-2 text-base font-semibold tracking-tight">
        {aiName || 'Assistant'}
      </h3>
      <p className="text-tx-muted max-w-xs text-center text-[13px] leading-relaxed">{message}</p>

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
      <div className="flex-1 overflow-y-auto px-4 py-5">
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
          />
        ))}

        {isLoading && !messages.some((m) => m.isStreaming) && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-3 pb-3 pt-2">
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
              title="Envoyer (Entrée)"
              className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent-500)/0.5)]',
                input.trim() && !isLoading
                  ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-[0_2px_8px_hsl(var(--accent-500)/0.35)] hover:opacity-90'
                  : 'text-tx-disabled bg-[hsl(var(--surface-2))]'
              )}
            >
              <SendIcon className="h-4 w-4" />
              <span className="sr-only">Envoyer</span>
            </button>
          </div>
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
      <div className="px-3 pb-3 pt-2">
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
    </div>
  );
}
