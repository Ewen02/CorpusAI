import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface TrendBadgeProps {
  value: number;
  isPositive: boolean;
  className?: string;
}

export function TrendBadge({ value, isPositive, className }: TrendBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[12px] font-medium',
        isPositive
          ? 'bg-[hsl(var(--success)/0.12)] text-[hsl(var(--success))]'
          : 'bg-[hsl(var(--danger)/0.12)] text-[hsl(var(--danger))]',
        className
      )}
    >
      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {value > 0 ? '+' : ''}
      {value}%
    </span>
  );
}
