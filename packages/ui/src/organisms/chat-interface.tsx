'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from '../atoms/button';
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
  primaryColor?: string;
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
  primaryColor?: string;
  onSourceClick?: (source: ChatSource) => void;
}

function MessageBubble({
  message,
  aiName = 'Assistant',
  aiAvatar,
  userAvatar,
  primaryColor,
  onSourceClick,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex w-full gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <Avatar
        className={cn('h-8 w-8 shrink-0 ring-2', isUser ? 'ring-white/[0.06]' : 'ring-primary/20')}
      >
        <AvatarImage src={isUser ? userAvatar : aiAvatar} />
        <AvatarFallback
          className={cn(
            'text-xs font-medium',
            isUser ? 'bg-white/[0.08] text-foreground' : 'bg-primary text-primary-foreground'
          )}
          style={!isUser && primaryColor ? { backgroundColor: primaryColor } : undefined}
        >
          {isUser ? 'Moi' : aiName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex max-w-[80%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div
          className={cn(
            'rounded-2xl px-4 py-3 text-sm',
            isUser
              ? 'rounded-br-md bg-primary/90 text-primary-foreground shadow-md shadow-primary/20'
              : 'rounded-bl-md border border-border bg-card text-foreground shadow-sm'
          )}
          style={isUser && primaryColor ? { backgroundColor: primaryColor } : undefined}
        >
          {message.isStreaming ? (
            <div className="inline-flex items-start gap-1">
              <MarkdownRenderer content={message.content} />
              <span className="animate-pulse text-primary">▊</span>
            </div>
          ) : isUser ? (
            <span className="whitespace-pre-wrap">{message.content}</span>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}
        </div>

        {/* Confidence badge for assistant messages */}
        {!isUser &&
          message.confidence &&
          !message.isStreaming &&
          message.sources &&
          message.sources.length > 0 && (
            <div className="mt-1 flex items-center gap-1.5">
              <span
                className={cn(
                  'rounded-full border px-2.5 py-0.5 text-xs backdrop-blur-sm',
                  message.confidence === 'HIGH' &&
                    'border-green-500/20 bg-green-500/10 text-green-400',
                  message.confidence === 'MEDIUM' &&
                    'border-yellow-500/20 bg-yellow-500/10 text-yellow-400',
                  message.confidence === 'LOW' && 'border-red-500/20 bg-red-500/10 text-red-400'
                )}
              >
                {message.confidence === 'HIGH' && 'Confiance elevee'}
                {message.confidence === 'MEDIUM' && 'Confiance moyenne'}
                {message.confidence === 'LOW' && 'Confiance faible'}
              </span>
            </div>
          )}

        {message.sources && message.sources.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {message.sources.map((source, index) => (
              <button
                key={`${source.documentId}-${index}`}
                onClick={() => onSourceClick?.(source)}
                className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs text-primary transition-all duration-200 hover:border-primary/30 hover:bg-primary/20"
              >
                {source.documentName}
                {source.pageNumber && ` p.${source.pageNumber}`}
              </button>
            ))}
          </div>
        )}

        <span className="text-[11px] text-muted-foreground/60">
          {message.createdAt.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

function TypingIndicator({
  aiName = 'Assistant',
  primaryColor,
}: {
  aiName?: string;
  primaryColor?: string;
}) {
  return (
    <div className="flex w-full gap-3">
      <Avatar className="h-8 w-8 shrink-0 ring-2 ring-primary/20">
        <AvatarFallback
          className="bg-primary text-xs text-primary-foreground"
          style={primaryColor ? { backgroundColor: primaryColor } : undefined}
        >
          {aiName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-card px-4 py-3 shadow-sm">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" />
      </div>
    </div>
  );
}

function WelcomeMessage({
  message,
  aiName,
  primaryColor,
}: {
  message: string;
  aiName?: string;
  primaryColor?: string;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center py-12">
      <div
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20"
        style={primaryColor ? { backgroundColor: `${primaryColor}15` } : undefined}
      >
        <span
          className="text-2xl font-bold text-primary"
          style={primaryColor ? { color: primaryColor } : undefined}
        >
          {aiName?.charAt(0)?.toUpperCase() || 'A'}
        </span>
      </div>
      <h3 className="mb-2 text-lg font-semibold">{aiName || 'Assistant'}</h3>
      <p className="max-w-sm text-center text-sm text-muted-foreground">{message}</p>
      <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground/50">
        <span className="h-1 w-1 rounded-full bg-primary/30" />
        <span>Propulsé par CorpusAI</span>
        <span className="h-1 w-1 rounded-full bg-primary/30" />
      </div>
    </div>
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
  primaryColor,
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
      <div className="flex-1 space-y-6 overflow-y-auto p-4">
        {messages.length === 0 && welcomeMessage && (
          <WelcomeMessage message={welcomeMessage} aiName={aiName} primaryColor={primaryColor} />
        )}

        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            aiName={aiName}
            aiAvatar={aiAvatar}
            userAvatar={userAvatar}
            primaryColor={primaryColor}
            onSourceClick={onSourceClick}
          />
        ))}

        {isLoading && !messages.some((m) => m.isStreaming) && (
          <TypingIndicator aiName={aiName} primaryColor={primaryColor} />
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card p-4">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="relative flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={isLoading}
              rows={1}
              className="w-full resize-none rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground transition-all duration-200 placeholder:text-muted-foreground/50 focus:border-primary/50 focus:outline-none focus:ring-1 focus:ring-primary/20 disabled:opacity-50"
              autoComplete="off"
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isLoading}
            className="h-[46px] w-[46px] shrink-0 rounded-xl"
            style={primaryColor ? { backgroundColor: primaryColor } : undefined}
          >
            <SendIcon className="h-4 w-4" />
            <span className="sr-only">Envoyer</span>
          </Button>
        </form>
        <p className="mt-2 text-center text-[11px] text-muted-foreground/40">
          Shift + Entrée pour un saut de ligne
        </p>
      </div>
    </div>
  );
}

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
// Skeleton Loader
// ============================================

export function ChatInterfaceSkeleton() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-6 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn('flex gap-3', i % 2 === 0 && 'flex-row-reverse')}>
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className={cn('h-16 rounded-2xl', i % 2 === 0 ? 'w-1/3' : 'w-2/3')} />
          </div>
        ))}
      </div>
      <div className="border-t border-border bg-card p-4">
        <div className="flex gap-2">
          <Skeleton className="h-[46px] flex-1 rounded-xl" />
          <Skeleton className="h-[46px] w-[46px] rounded-xl" />
        </div>
      </div>
    </div>
  );
}
