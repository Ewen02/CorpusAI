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
        'inline-flex items-center gap-1 text-sm font-medium',
        isPositive ? 'text-green-500' : 'text-red-500',
        className
      )}
    >
      {isPositive ? (
        <TrendingUp className="h-4 w-4" />
      ) : (
        <TrendingDown className="h-4 w-4" />
      )}
      {value}%
    </span>
  );
}
