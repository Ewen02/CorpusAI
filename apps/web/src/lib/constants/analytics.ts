import type { AnalyticsPeriod } from '@/lib/queries';

export const PERIOD_OPTIONS: { value: AnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7 jours' },
  { value: '30d', label: '30 jours' },
  { value: '90d', label: '90 jours' },
];

export const CHART_AXIS_STYLE = { fill: 'hsl(var(--muted-foreground))' };
