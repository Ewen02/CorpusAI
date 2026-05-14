import type { AICategory } from '@corpusai/types';

export type AIStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';

export type AccessMode = 'open' | 'token' | 'code' | 'invite';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export const CATEGORY_VALUES: AICategory[] = [
  'SUPPORT',
  'EDUCATION',
  'LEGAL',
  'FINANCE',
  'HEALTH',
  'TECH',
  'OTHER',
];

export const STATUS_VALUES: AIStatus[] = ['DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED'];

export const STATUS_COLORS: Record<AIStatus, string> = {
  DRAFT: 'bg-[hsl(var(--warning)/0.15)] text-[hsl(var(--warning))]',
  ACTIVE: 'bg-[hsl(var(--success)/0.15)] text-[hsl(var(--success))]',
  PAUSED: 'bg-[hsl(var(--warning)/0.1)] text-[hsl(var(--warning)/0.8)]',
  ARCHIVED: 'bg-[hsl(var(--surface-3))] text-tx-muted',
};

export const INPUT_CLASS =
  'h-9 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]';

export const TEXTAREA_CLASS =
  'border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]';

export const SELECT_CLASS =
  'h-9 w-full rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] px-3 text-[13px] text-tx-primary focus:border-[hsl(var(--accent-500)/0.4)] focus:outline-none focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]';

export const TAB_TRIGGER_CLASS =
  'rounded-md px-4 py-1.5 text-[13px] font-medium transition-all duration-150 data-[state=active]:bg-[hsl(var(--surface-1))] data-[state=active]:text-tx-primary data-[state=active]:shadow-sm data-[state=active]:ring-1 data-[state=active]:ring-[hsl(var(--border-default))] data-[state=inactive]:text-tx-muted';

export const CARD_CLASS =
  'rounded-xl border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] p-5';
