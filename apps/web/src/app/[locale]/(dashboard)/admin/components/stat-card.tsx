import * as React from 'react';
import { Card, CardContent, Badge } from '@corpusai/ui';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  badge?: { text: string; variant: 'destructive' | 'secondary' | 'default' };
}

export function StatCard({ icon, label, value, badge }: StatCardProps) {
  return (
    <Card variant="glass">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--surface-2))] text-primary">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xl font-bold text-tx-primary">{value.toLocaleString()}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] text-tx-muted">{label}</p>
            {badge && (
              <Badge variant={badge.variant} className="h-4 px-1 text-[9px] leading-none">
                {badge.text}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
