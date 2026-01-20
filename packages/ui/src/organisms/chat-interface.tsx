'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { Button } from '../atoms/button';
import { Input } from '../atoms/input';
import { Avatar, AvatarFallback, AvatarImage } from '../atoms/avatar';
import { Skeleton } from '../atoms/skeleton';
import { Card, CardContent } from '../molecules/card';

// ============================================
// Types
// ============================================

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
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
    <div
      className={cn(
        'flex gap-3 w-full',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarImage src={isUser ? userAvatar : aiAvatar} />
        <AvatarFallback
          className={cn(
            'text-xs font-medium',
            isUser
              ? 'bg-slate-600 text-slate-200'
              : 'bg-primary text-primary-foreground'
          )}
          style={!isUser && primaryColor ? { backgroundColor: primaryColor } : undefined}
        >
          {isUser ? 'Moi' : aiName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div
        className={cn(
          'flex flex-col gap-1 max-w-[80%]',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        <div
          className={cn(
            'rounded-2xl px-4 py-2 text-sm',
            isUser
              ? 'bg-primary text-primary-foreground rounded-br-md'
              : 'bg-slate-700/80 text-slate-100 rounded-bl-md'
          )}
          style={isUser && primaryColor ? { backgroundColor: primaryColor } : undefined}
        >
          {message.isStreaming ? (
            <span className="inline-flex items-center gap-1">
              {message.content}
              <span className="animate-pulse">▊</span>
            </span>
          ) : (
            <span className="whitespace-pre-wrap">{message.content}</span>
          )}
        </div>

        {message.sources && message.sources.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.sources.map((source, index) => (
              <button
                key={`${source.documentId}-${index}`}
                onClick={() => onSourceClick?.(source)}
                className="text-xs px-2 py-0.5 rounded-full bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
              >
                📄 {source.documentName}
                {source.pageNumber && ` p.${source.pageNumber}`}
              </button>
            ))}
          </div>
        )}

        <span className="text-xs text-muted-foreground">
          {message.createdAt.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 w-full">
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
          A
        </AvatarFallback>
      </Avatar>
      <div className="flex items-center gap-1 bg-muted rounded-2xl rounded-bl-md px-4 py-3">
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
      </div>
    </div>
  );
}

function WelcomeMessage({
  message,
  aiName,
}: {
  message: string;
  aiName?: string;
}) {
  return (
    <Card className="bg-muted/50 border-dashed">
      <CardContent className="pt-6 text-center">
        <p className="text-sm text-muted-foreground">{message}</p>
        {aiName && (
          <p className="text-xs text-muted-foreground/70 mt-2">— {aiName}</p>
        )}
      </CardContent>
    </Card>
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
  const inputRef = React.useRef<HTMLInputElement>(null);

  const scrollToBottom = React.useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  React.useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed && !isLoading) {
      onSendMessage(trimmed);
      setInput('');
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
    <div className={cn('flex flex-col h-full', className)}>
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            primaryColor={primaryColor}
            onSourceClick={onSourceClick}
          />
        ))}

        {isLoading && !messages.some((m) => m.isStreaming) && <TypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="flex-1"
            autoComplete="off"
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            style={primaryColor ? { backgroundColor: primaryColor } : undefined}
          >
            <SendIcon className="h-4 w-4" />
            <span className="sr-only">Envoyer</span>
          </Button>
        </form>
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
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className={cn('flex gap-3', i % 2 === 0 && 'flex-row-reverse')}>
            <Skeleton className="h-8 w-8 rounded-full shrink-0" />
            <Skeleton className={cn('h-16 rounded-2xl', i % 2 === 0 ? 'w-1/3' : 'w-2/3')} />
          </div>
        ))}
      </div>
      <div className="border-t border-border p-4">
        <div className="flex gap-2">
          <Skeleton className="flex-1 h-10" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>
    </div>
  );
}
