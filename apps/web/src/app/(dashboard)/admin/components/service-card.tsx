'use client';

import * as React from 'react';
import { Card, CardContent, Badge } from '@corpusai/ui';
import { CheckCircle2, XCircle, AlertCircle, RefreshCw } from 'lucide-react';
import type { ServiceStatus } from '../types';

function StatusIcon({ status }: { status: string }) {
  if (status === 'connected')
    return <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />;
  if (status === 'not_configured')
    return <AlertCircle className="h-4 w-4 text-[hsl(var(--warning))]" />;
  return <XCircle className="h-4 w-4 text-[hsl(var(--danger))]" />;
}

export function StatusBadge({ status }: { status: string }) {
  const variant =
    status === 'connected' ? 'default' : status === 'not_configured' ? 'secondary' : 'destructive';
  return <Badge variant={variant}>{status}</Badge>;
}

export function RefreshOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[hsl(var(--background)/0.6)] backdrop-blur-[2px]">
      <RefreshCw className="h-4 w-4 animate-spin text-tx-muted" />
    </div>
  );
}

export function ServiceCard({
  name,
  icon: Icon,
  service,
  extra,
}: {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  service: ServiceStatus;
  extra?: React.ReactNode;
}) {
  return (
    <Card variant="glass">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--surface-2))]">
              <Icon className="h-4 w-4 text-tx-muted" />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-tx-primary">{name}</p>
              <p className="text-[12px] text-tx-muted">
                {service.latencyMs > 0 ? `${service.latencyMs}ms` : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusIcon status={service.status} />
            <StatusBadge status={service.status} />
          </div>
        </div>
        {extra && (
          <div className="mt-3 border-t border-[hsl(var(--border-subtle))] pt-3">{extra}</div>
        )}
        {service.error && (
          <p className="mt-2 truncate text-[11px] text-[hsl(var(--danger))]">{service.error}</p>
        )}
      </CardContent>
    </Card>
  );
}
