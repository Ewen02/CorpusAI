import * as React from 'react';
import { cn } from '../lib/utils';
import { TrendBadge } from './trend-badge';

export interface StatCardProps {
  title: string;
  value: number;
  trend?: { value: number; isPositive: boolean };
  trendLabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
}

export function StatCard({
  title,
  value,
  trend,
  trendLabel = 'vs période précédente',
  icon: Icon,
  className,
}: StatCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-[hsl(var(--accent-500)/0.2)] p-5',
        'bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(224_15%_12%)]',
        'shadow-[var(--shadow-accent-sm)]',
        className
      )}
    >
      {/* Ambient glow top-right */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,hsl(var(--accent-500)/0.1),transparent_70%)]" />

      {/* Header : label + icon */}
      <div className="relative flex items-start justify-between gap-3">
        <p className="text-tx-muted text-[13px] font-medium">{title}</p>
        {Icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 ring-1 ring-[hsl(var(--accent-500)/0.2)]">
            <Icon className="h-4 w-4 text-indigo-400" />
          </div>
        )}
      </div>

      {/* Value — domine */}
      <div className="relative mt-3">
        <span className="text-tx-primary text-[28px] font-bold leading-none tracking-tight">
          {value.toLocaleString()}
        </span>
      </div>

      {/* Trend */}
      {trend && (
        <div className="text-tx-muted relative mt-2 flex items-center gap-1.5 text-[12px]">
          <TrendBadge value={trend.value} isPositive={trend.isPositive} />
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
