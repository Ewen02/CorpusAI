'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Skeleton } from '@corpusai/ui';
import { PageWrapper } from '@/components/page-wrapper';
import { useWebhook } from '@/lib/queries';
import { WebhookConfigurationCard, WebhookTestSender, WebhookDeliveryLog } from './components';

export default function WebhookDebuggerPage() {
  const t = useTranslations('settings.webhooks.debugger');
  const params = useParams();
  const id = params.id as string;
  const { data: webhook, isLoading, isError } = useWebhook(id);

  // We never receive the raw secret from the GET /webhooks/:id endpoint, so the
  // debugger renders a masked placeholder hint that the value lives server-side.
  const maskedSecret = '••••••••••••••••••••••••••••••••';

  return (
    <PageWrapper className="space-y-5">
      <div className="flex items-center justify-between">
        <Button asChild variant="ghost" size="sm">
          <Link href="/settings/webhooks">{t('back')}</Link>
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      )}

      {isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {t('notFound')}
        </p>
      )}

      {webhook && (
        <>
          <WebhookConfigurationCard webhook={webhook} maskedSecret={maskedSecret} />
          <WebhookTestSender webhookId={webhook.id} />
          <WebhookDeliveryLog webhookId={webhook.id} />
        </>
      )}
    </PageWrapper>
  );
}
