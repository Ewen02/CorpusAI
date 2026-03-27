export const PLAN_COLORS: Record<string, string> = {
  FREE: 'secondary',
  CREATOR: 'default',
  PRO: 'default',
  ENTERPRISE: 'default',
};

export const STATUS_COLORS: Record<string, 'secondary' | 'destructive' | 'default'> = {
  ACTIVE: 'secondary',
  CANCELED: 'destructive',
  PAST_DUE: 'destructive',
  TRIALING: 'default',
};

export const AI_STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  ACTIVE: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  DRAFT: { bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  PAUSED: { bg: 'bg-orange-500/10', text: 'text-orange-400', dot: 'bg-orange-400' },
  ARCHIVED: { bg: 'bg-zinc-500/10', text: 'text-zinc-400', dot: 'bg-zinc-400' },
};

export const REFUSAL_PHRASE = 'Je ne trouve pas cette information dans les documents disponibles';

export const AUTO_REFRESH_INTERVAL = 30_000; // 30 seconds
