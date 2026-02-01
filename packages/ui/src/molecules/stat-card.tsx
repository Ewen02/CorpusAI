import * as React from 'react';
import { cn } from '../lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from './card';
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
    <Card variant="glass" className={cn('border-l-2 border-l-primary/50', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <div className="bg-primary/10 rounded-xl p-2.5">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value.toLocaleString()}</div>
        {trend && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <TrendBadge value={trend.value} isPositive={trend.isPositive} />
            <span>{trendLabel}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
