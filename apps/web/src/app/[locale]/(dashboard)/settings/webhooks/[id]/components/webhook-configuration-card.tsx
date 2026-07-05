'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@corpusai/ui';
import { useCopyToClipboard } from '@/lib/hooks';
import { CheckIcon, CopyIcon, WebhookIcon } from '@/lib/icons';
import type { WebhookDetail } from '@/lib/queries';

interface WebhookConfigurationCardProps {
  webhook: WebhookDetail;
  maskedSecret: string;
}

export function WebhookConfigurationCard({ webhook, maskedSecret }: WebhookConfigurationCardProps) {
  const t = useTranslations('settings.webhooks.debugger');
  const { copied, copy } = useCopyToClipboard(1800);

  const handleCopy = () => {
    copy(maskedSecret);
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <WebhookIcon className="h-4 w-4 text-indigo-400" />
          {t('configuration')}
        </CardTitle>
        <CardDescription>{t('configurationDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <Field label={t('url')}>
          <code className="block break-all rounded bg-[hsl(var(--surface-2))] p-2 font-mono text-xs text-tx-secondary">
            {webhook.url}
          </code>
        </Field>

        <Field label={t('events')}>
          <div className="flex flex-wrap gap-1.5">
            {webhook.events.map((event) => (
              <Badge key={event} variant="secondary" className="text-[10px]">
                {event}
              </Badge>
            ))}
            <Badge variant={webhook.active ? 'default' : 'outline'} className="text-[10px]">
              {webhook.active ? t('active') : t('inactive')}
            </Badge>
          </div>
        </Field>

        <Field label={t('secret')} hint={t('secretHelp')}>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-[hsl(var(--surface-2))] p-2 font-mono text-xs text-tx-secondary">
              {maskedSecret}
            </code>
            <Button variant="outline" size="sm" onClick={handleCopy} aria-label={t('copySecret')}>
              {copied ? (
                <>
                  <CheckIcon className="mr-1 h-3 w-3" />
                  {t('copied')}
                </>
              ) : (
                <>
                  <CopyIcon className="mr-1 h-3 w-3" />
                  {t('copySecret')}
                </>
              )}
            </Button>
          </div>
        </Field>
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-tx-muted">{label}</p>
      {children}
      {hint && <p className="text-[11px] text-tx-disabled">{hint}</p>}
    </div>
  );
}
