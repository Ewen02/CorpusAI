import * as React from 'react';
import { cn } from '../lib/utils';

const CATEGORY_LABELS: Record<string, string> = {
  SUPPORT: 'Support',
  EDUCATION: 'Éducation',
  LEGAL: 'Juridique',
  FINANCE: 'Finance',
  HEALTH: 'Santé',
  TECH: 'Tech',
  OTHER: 'Autre',
};

export interface ExploreAICardProps {
  slug: string;
  name: string;
  description?: string | null;
  creatorName?: string | null;
  creatorUsername?: string | null;
  category?: string;
  conversationCount?: number;
  onTry?: () => void;
  className?: string;
}

export function ExploreAICard({
  slug,
  name,
  description,
  creatorName,
  creatorUsername,
  category,
  conversationCount = 0,
  onTry,
  className,
}: ExploreAICardProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join('')
    .toUpperCase();

  const categoryLabel = category ? CATEGORY_LABELS[category] : null;

  return (
    <div
      className={cn(
        'group flex flex-col rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))]',
        'transition-all duration-150 hover:-translate-y-[2px] hover:border-[hsl(var(--accent-500)/0.3)] hover:bg-[hsl(var(--surface-2))] hover:shadow-[0_4px_20px_hsl(var(--accent-500)/0.08)]',
        className
      )}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        {/* Avatar — gradient indigo uniforme */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 text-[13px] font-semibold text-indigo-400 ring-1 ring-[hsl(var(--accent-500)/0.2)]">
          {initials}
        </div>

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
          <ChatBubbleIcon className="h-3 w-3" />
          {conversationCount.toLocaleString('fr-FR')}
        </span>
        <button
          onClick={onTry}
          className="rounded-md bg-[hsl(var(--accent-500)/0.1)] px-3 py-1.5 text-[12px] font-medium text-indigo-400 transition-all duration-150 hover:bg-[hsl(var(--accent-500)/0.18)] hover:text-indigo-300"
        >
          Essayer →
        </button>
      </div>
    </div>
  );
}

function ChatBubbleIcon({ className }: { className?: string }) {
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
