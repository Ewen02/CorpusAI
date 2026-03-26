import * as React from 'react';
import { cn } from '../lib/utils';
import { Badge } from '../atoms/badge';

export interface SectionHeaderProps {
  step?: number;
  title: string;
  description: string;
  badge?: string;
  className?: string;
}

export function SectionHeader({ step, title, description, badge, className }: SectionHeaderProps) {
  return (
    <div className={cn('mb-5', className)}>
      <div className="mb-1.5 flex items-center gap-2">
        {step !== undefined && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[hsl(var(--accent-500)/0.15)] text-[11px] font-semibold text-[hsl(var(--accent-500))]">
            {step}
          </span>
        )}
        <h3 className="text-tx-primary text-[15px] font-semibold">{title}</h3>
        {badge && (
          <Badge variant="outline" className="text-[11px]">
            {badge}
          </Badge>
        )}
      </div>
      <p className="text-tx-muted text-[13px]">{description}</p>
    </div>
  );
}
