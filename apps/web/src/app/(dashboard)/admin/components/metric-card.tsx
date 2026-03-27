import { Card, CardContent } from '@corpusai/ui';

interface MetricCardProps {
  label: string;
  value: number | null;
  delta: { text: string; color: string } | null;
  unit?: string;
}

export function MetricCard({ label, value, delta, unit = '' }: MetricCardProps) {
  return (
    <Card variant="glass">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold">
          {value !== null ? `${value.toFixed(unit === 'ms' ? 0 : 2)}${unit}` : '\u2014'}
        </p>
        {delta && <p className={`mt-0.5 text-xs font-medium ${delta.color}`}>{delta.text}</p>}
      </CardContent>
    </Card>
  );
}
