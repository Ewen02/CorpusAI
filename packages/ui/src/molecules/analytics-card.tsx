import * as React from 'react';
import { cn } from '../lib/utils';
import { IconBox } from '../atoms/icon-box';

export interface AnalyticsCardProps {
  title?: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  className?: string;
}

export function AnalyticsCard({ title, icon: Icon, children, className }: AnalyticsCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border border-[hsl(var(--accent-500)/0.2)]',
        'bg-gradient-to-br from-[hsl(var(--surface-1))] to-[hsl(224_15%_12%)]',
        'p-5 shadow-[var(--shadow-accent-sm)]',
        className
      )}
    >
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-[radial-gradient(circle,hsl(var(--accent-500)/0.1),transparent_70%)]" />

      {/* Header */}
      {(title || Icon) && (
        <div className="relative flex items-start justify-between gap-3">
          {title && <p className="text-tx-muted text-[13px] font-medium">{title}</p>}
          {Icon && (
            <IconBox size="md">
              <Icon className="h-4 w-4 text-indigo-400" />
            </IconBox>
          )}
        </div>
      )}

      {/* Content */}
      <div className="relative">{children}</div>
    </div>
  );
}
