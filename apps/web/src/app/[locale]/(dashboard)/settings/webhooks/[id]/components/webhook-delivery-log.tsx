'use client';

import * as React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@corpusai/ui';
import { LoaderIcon } from '@/lib/icons';
import {
  useRetryWebhookDelivery,
  useWebhookDeliveries,
  type WebhookDeliveryDetail,
} from '@/lib/queries';

interface WebhookDeliveryLogProps {
  webhookId: string;
}

export function WebhookDeliveryLog({ webhookId }: WebhookDeliveryLogProps) {
  const t = useTranslations('settings.webhooks.debugger');
  const locale = useLocale();
  const { data, isLoading } = useWebhookDeliveries(webhookId, 20);
  const retry = useRetryWebhookDelivery(webhookId);
  const [retryingId, setRetryingId] = React.useState<string | null>(null);

  const handleRetry = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    try {
      await retry.mutateAsync(deliveryId);
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-base">{t('deliveryLog')}</CardTitle>
        <CardDescription>{t('deliveryLogDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : !data || data.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-tx-muted">{t('noDeliveries')}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">{t('columnStatus')}</TableHead>
                  <TableHead className="w-20">{t('columnStatusCode')}</TableHead>
                  <TableHead>{t('columnEvent')}</TableHead>
                  <TableHead className="w-24">{t('columnAttempt')}</TableHead>
                  <TableHead className="w-44">{t('columnDate')}</TableHead>
                  <TableHead className="w-20 text-right">{t('columnActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.items.map((delivery) => (
                  <DeliveryRow
                    key={delivery.id}
                    delivery={delivery}
                    locale={locale}
                    isRetrying={retryingId === delivery.id}
                    onRetry={() => handleRetry(delivery.id)}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DeliveryRow({
  delivery,
  locale,
  isRetrying,
  onRetry,
}: {
  delivery: WebhookDeliveryDetail;
  locale: string;
  isRetrying: boolean;
  onRetry: () => void;
}) {
  const t = useTranslations('settings.webhooks.debugger');
  return (
    <TableRow>
      <TableCell>
        <Badge variant={delivery.success ? 'default' : 'destructive'} className="text-[10px]">
          {delivery.success ? t('success') : t('failed')}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-xs">{delivery.statusCode ?? '---'}</TableCell>
      <TableCell className="text-xs">{delivery.eventType}</TableCell>
      <TableCell className="font-mono text-xs">#{delivery.attempt}</TableCell>
      <TableCell className="text-xs text-tx-muted">
        {new Date(delivery.createdAt).toLocaleString(locale)}
      </TableCell>
      <TableCell className="text-right">
        {!delivery.success && (
          <Button variant="outline" size="sm" disabled={isRetrying} onClick={onRetry}>
            {isRetrying ? (
              <>
                <LoaderIcon className="mr-1 h-3 w-3 animate-spin" />
                {t('retrying')}
              </>
            ) : (
              t('retry')
            )}
          </Button>
        )}
      </TableCell>
    </TableRow>
  );
}
