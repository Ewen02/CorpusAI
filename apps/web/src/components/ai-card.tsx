'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
} from '@corpusai/ui';
import { AI_STATUS_CONFIG } from '@/lib/constants';
import { getTimeAgo } from '@/lib/utils';
import { BotIcon, FileIcon, MessageIcon, UsersIcon } from '@/lib/icons';
import type { AI, AIStatus } from '@corpusai/types';

/**
 * Full AI data for detailed card display.
 */
interface AICardFullData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  status: AIStatus;
  documentCount: number;
  questionCount: number;
  conversationCount: number;
  updatedAt: string | Date;
}

/**
 * Minimal AI data for compact card display.
 */
interface AICardCompactData {
  id: string;
  name: string;
  status: string;
  _count?: { documents: number; conversations: number };
  questionCount?: number;
}

interface AICardBaseProps {
  onClick: () => void;
}

interface AICardFullProps extends AICardBaseProps {
  ai: AI | AICardFullData;
  variant?: 'full';
}

interface AICardCompactProps extends AICardBaseProps {
  ai: AICardCompactData;
  variant: 'compact';
}

export type AICardProps = AICardFullProps | AICardCompactProps;

/**
 * Unified AI card component with support for full and compact variants.
 *
 * @example
 * // Full variant (default) - shows all stats
 * <AICard ai={ai} onClick={() => navigate(ai.id)} />
 *
 * // Compact variant - minimal display
 * <AICard ai={ai} variant="compact" onClick={() => navigate(ai.id)} />
 */
export const AICard = React.memo(function AICard(props: AICardProps) {
  const { onClick } = props;

  if (props.variant === 'compact') {
    return <AICardCompact ai={props.ai} onClick={onClick} />;
  }

  return <AICardFull ai={props.ai} onClick={onClick} />;
});

/**
 * Full variant with all stats and details.
 */
const AICardFull = React.memo(function AICardFull({
  ai,
  onClick,
}: {
  ai: AI | AICardFullData;
  onClick: () => void;
}) {
  const status = AI_STATUS_CONFIG[ai.status];
  const updatedAt = new Date(ai.updatedAt);
  const timeAgo = getTimeAgo(updatedAt);

  return (
    <Card
      variant="interactive"
      className="cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
              <BotIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base truncate">{ai.name}</CardTitle>
              <p className="text-xs text-muted-foreground">/chat/{ai.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`h-2 w-2 rounded-full ${status.dot} ${ai.status === 'ACTIVE' ? 'shadow-[0_0_6px] shadow-green-500/50' : ''}`} />
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {ai.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {ai.description}
          </p>
        )}
        <div className="flex items-center gap-4 text-xs text-muted-foreground divide-x divide-border">
          <span className="flex items-center gap-1">
            <FileIcon className="h-3 w-3" />
            {ai.documentCount} docs
          </span>
          <span className="flex items-center gap-1 pl-4">
            <MessageIcon className="h-3 w-3" />
            {ai.questionCount} questions
          </span>
          <span className="flex items-center gap-1 pl-4">
            <UsersIcon className="h-3 w-3" />
            {ai.conversationCount} conv.
          </span>
        </div>
        <p className="text-xs text-muted-foreground/70 mt-2">Modifie {timeAgo}</p>
      </CardContent>
    </Card>
  );
});

/**
 * Compact variant for minimal display.
 */
const AICardCompact = React.memo(function AICardCompact({
  ai,
  onClick,
}: {
  ai: AICardCompactData;
  onClick: () => void;
}) {
  const status =
    AI_STATUS_CONFIG[ai.status as keyof typeof AI_STATUS_CONFIG] ||
    AI_STATUS_CONFIG.DRAFT;
  const documentCount = ai._count?.documents ?? 0;
  const questionCount = ai.questionCount ?? 0;

  return (
    <Card
      variant="interactive"
      className="cursor-pointer"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{ai.name}</CardTitle>
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>{documentCount} documents</span>
          <span>•</span>
          <span>{questionCount} questions</span>
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * @deprecated Use `<AICard variant="compact" />` instead.
 * Kept for backward compatibility.
 */
export const AIPreviewCard = React.memo(function AIPreviewCard({
  ai,
  onClick,
}: {
  ai: AICardCompactData;
  onClick: () => void;
}) {
  return <AICard ai={ai} variant="compact" onClick={onClick} />;
});
