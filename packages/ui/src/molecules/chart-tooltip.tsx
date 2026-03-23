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
        'rounded-lg border border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))]',
        'px-3 py-2 shadow-lg backdrop-blur-sm',
        className
      )}
    >
      <p className="text-tx-muted text-[11px] font-medium">{formattedLabel}</p>
      <p className="text-tx-primary mt-0.5 text-[15px] font-semibold">
        {value} <span className="text-tx-muted text-[12px] font-normal">{metric}</span>
      </p>
    </div>
  );
}
