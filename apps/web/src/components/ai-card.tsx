'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge, cn } from '@corpusai/ui';
import { AI_STATUS_CONFIG } from '@/lib/constants';
import { getTimeAgo } from '@/lib/utils';
import { FileIcon, MessageIcon, UsersIcon } from '@/lib/icons';
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
  const initial = ai.name.charAt(0).toUpperCase();

  return (
    <div
      onClick={onClick}
      className="group relative cursor-pointer rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5 transition-all duration-150 hover:-translate-y-[1px] hover:border-[hsl(var(--border-strong))] hover:bg-[hsl(var(--surface-2))] hover:shadow-md"
    >
      {/* Header : avatar + nom + status */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {/* Avatar initiale avec gradient indigo */}
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 text-sm font-semibold text-indigo-400 ring-1 ring-[hsl(var(--accent-500)/0.2)]">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold leading-tight text-tx-primary">
              {ai.name}
            </p>
            <p className="text-[12px] text-tx-muted">/chat/{ai.slug}</p>
          </div>
        </div>

        {/* Status */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span
            className={cn(
              'h-1.5 w-1.5 rounded-full',
              ai.status === 'ACTIVE'
                ? 'animate-pulse bg-success shadow-[0_0_6px_hsl(var(--success)/0.6)]'
                : ai.status === 'DRAFT'
                  ? 'bg-warning'
                  : 'bg-tx-disabled/40'
            )}
          />
          <Badge variant={status.variant} className="text-[11px]">
            {status.label}
          </Badge>
        </div>
      </div>

      {/* Description */}
      {ai.description && (
        <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-tx-muted">
          {ai.description}
        </p>
      )}

      {/* Stats row */}
      <div className="mt-4 flex items-center gap-3 text-[12px] text-tx-muted">
        <span className="flex items-center gap-1.5">
          <FileIcon className="h-3 w-3 opacity-60" />
          {ai.documentCount} docs
        </span>
        <span className="h-3 w-px bg-[hsl(var(--border-default))]" />
        <span className="flex items-center gap-1.5">
          <MessageIcon className="h-3 w-3 opacity-60" />
          {ai.questionCount}
        </span>
        <span className="h-3 w-px bg-[hsl(var(--border-default))]" />
        <span className="flex items-center gap-1.5">
          <UsersIcon className="h-3 w-3 opacity-60" />
          {ai.conversationCount}
        </span>
        <span className="ml-auto text-[11px] text-tx-disabled">{timeAgo}</span>
      </div>
    </div>
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
    AI_STATUS_CONFIG[ai.status as keyof typeof AI_STATUS_CONFIG] || AI_STATUS_CONFIG.DRAFT;
  const documentCount = ai._count?.documents ?? 0;
  const questionCount = ai.questionCount ?? 0;

  return (
    <Card variant="interactive" className="cursor-pointer" onClick={onClick}>
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
