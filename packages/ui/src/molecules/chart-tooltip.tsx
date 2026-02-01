import * as React from 'react';
import { cn } from '../lib/utils';

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number }>;
  label?: string | number;
  metric: string;
  formatLabel?: (label: string | number) => string;
  className?: string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  metric,
  formatLabel,
  className,
}: ChartTooltipProps) {
  if (!active || !payload?.length || !label) return null;

  const value = payload[0]?.value;
  const formattedLabel = formatLabel ? formatLabel(label) : String(label);

  return (
    <div
      className={cn(
        'rounded-lg border border-white/[0.06] bg-card/80 backdrop-blur-xl p-3 shadow-xl',
        className
      )}
    >
      <p className="text-sm font-medium">{formattedLabel}</p>
      <p className="text-sm text-muted-foreground">
        {value} {metric}
      </p>
    </div>
  );
}
