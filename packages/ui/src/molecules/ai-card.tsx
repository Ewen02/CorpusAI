'use client';

import * as React from 'react';
import { cn } from '../lib/utils';
import { Badge } from '../atoms/badge';

// ── Shared styles ───────────────────────────────────────────────────

const cardBase = [
  'group flex flex-col rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))]',
  'cursor-pointer transition-all duration-150',
  'hover:-translate-y-[1px] hover:border-[hsl(var(--accent-500)/0.3)] hover:bg-[hsl(var(--surface-2))] hover:shadow-[0_4px_20px_hsl(var(--accent-500)/0.08)]',
].join(' ');

function AIAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 text-[13px] font-semibold text-indigo-400 ring-1 ring-[hsl(var(--accent-500)/0.2)]">
      {initials}
    </div>
  );
}

// ── Status config ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  string,
  { label: string; variant: 'success' | 'warning' | 'outline'; dot: string }
> = {
  ACTIVE: {
    label: 'Actif',
    variant: 'success',
    dot: 'animate-pulse bg-green-400 shadow-[0_0_6px_hsl(var(--success)/0.6)]',
  },
  DRAFT: { label: 'Brouillon', variant: 'warning', dot: 'bg-yellow-400' },
  PAUSED: { label: 'Pausé', variant: 'outline', dot: 'bg-tx-disabled/40' },
  ARCHIVED: { label: 'Archivé', variant: 'outline', dot: 'bg-tx-disabled/40' },
};

// ── Category labels ─────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  SUPPORT: 'Support',
  EDUCATION: 'Éducation',
  LEGAL: 'Juridique',
  FINANCE: 'Finance',
  HEALTH: 'Santé',
  TECH: 'Tech',
  OTHER: 'Autre',
};

// ── Dashboard variant ───────────────────────────────────────────────

export interface AICardDashboardProps {
  variant?: 'dashboard';
  name: string;
  slug: string;
  description?: string | null;
  status: string;
  documentCount: number;
  questionCount: number;
  conversationCount: number;
  updatedAt: string | Date;
  username?: string | null;
  onClick: () => void;
  className?: string;
}

// ── Explore variant ─────────────────────────────────────────────────

export interface AICardExploreProps {
  variant: 'explore';
  name: string;
  slug: string;
  description?: string | null;
  creatorName?: string | null;
  creatorUsername?: string | null;
  category?: string;
  conversationCount?: number;
  onClick: () => void;
  className?: string;
}

export type AICardProps = AICardDashboardProps | AICardExploreProps;

export const AICard = React.memo(function AICard(props: AICardProps) {
  if (props.variant === 'explore') {
    return <AICardExplore {...props} />;
  }
  return <AICardDashboard {...props} />;
});

// ── Dashboard implementation ────────────────────────────────────────

function AICardDashboard({
  name,
  slug,
  description,
  status,
  documentCount,
  questionCount,
  conversationCount,
  updatedAt,
  username,
  onClick,
  className,
}: AICardDashboardProps) {
  // DRAFT always exists in STATUS_CONFIG, so the fallback is always defined
  const statusConfig = (STATUS_CONFIG[status] ?? STATUS_CONFIG.DRAFT)!;
  const timeAgo = getTimeAgo(new Date(updatedAt));

  return (
    <div onClick={onClick} className={cn(cardBase, 'p-5', className)}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AIAvatar name={name} />
          <div className="min-w-0">
            <p className="text-tx-primary truncate text-[15px] font-semibold leading-tight">
              {name}
            </p>
            {username && (
              <p className="text-tx-muted text-[12px]">
                /chat/@{username}/{slug}
              </p>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} />
          <Badge variant={statusConfig.variant} className="text-[11px]">
            {statusConfig.label}
          </Badge>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-tx-muted mt-3 line-clamp-2 text-[13px] leading-relaxed">{description}</p>
      )}

      {/* Stats */}
      <div className="text-tx-muted mt-4 flex items-center gap-3 text-[12px]">
        <span className="flex items-center gap-1.5">
          <DocIcon className="h-3 w-3 opacity-60" />
          {documentCount} docs
        </span>
        <span className="h-3 w-px bg-[hsl(var(--border-default))]" />
        <span className="flex items-center gap-1.5">
          <ChatIcon className="h-3 w-3 opacity-60" />
          {questionCount}
        </span>
        <span className="h-3 w-px bg-[hsl(var(--border-default))]" />
        <span className="flex items-center gap-1.5">
          <UsersIcon className="h-3 w-3 opacity-60" />
          {conversationCount}
        </span>
        <span className="text-tx-disabled ml-auto text-[11px]">{timeAgo}</span>
      </div>
    </div>
  );
}

// ── Explore implementation ──────────────────────────────────────────

function AICardExplore({
  name,
  description,
  creatorName,
  category,
  conversationCount = 0,
  onClick,
  className,
}: AICardExploreProps) {
  const categoryLabel = category ? CATEGORY_LABELS[category] : null;

  return (
    <div onClick={onClick} className={cn(cardBase, className)}>
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <AIAvatar name={name} />
        <div className="min-w-0 flex-1">
          <h3 className="text-tx-primary truncate text-[14px] font-semibold leading-none tracking-tight">
            {name}
          </h3>
          {creatorName && (
            <p className="text-tx-disabled mt-1 truncate text-[11px]">par {creatorName}</p>
          )}
        </div>
        {categoryLabel && categoryLabel !== 'Autre' && (
          <span className="text-tx-muted shrink-0 rounded-md border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] px-1.5 py-0.5 text-[10px] font-medium">
            {categoryLabel}
          </span>
        )}
      </div>

      {/* Description */}
      <div className="flex-1 px-4 pb-3">
        <p className="text-tx-muted line-clamp-2 text-[12px] leading-relaxed">
          {description || 'Aucune description.'}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[hsl(var(--border-subtle))] px-4 py-3">
        <span className="text-tx-disabled flex items-center gap-1.5 text-[11px]">
          <ChatIcon className="h-3 w-3" />
          {conversationCount.toLocaleString('fr-FR')}
        </span>
        <span className="rounded-md bg-[hsl(var(--accent-500)/0.1)] px-3 py-1.5 text-[12px] font-medium text-indigo-400 transition-all duration-150 group-hover:bg-[hsl(var(--accent-500)/0.18)] group-hover:text-indigo-300">
          Essayer →
        </span>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}j`;
  const diffM = Math.floor(diffD / 30);
  return `${diffM} mois`;
}

// ── Icons (inline, minimal) ─────────────────────────────────────────

function DocIcon({ className }: { className?: string }) {
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

function ChatIcon({ className }: { className?: string }) {
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
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
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
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
