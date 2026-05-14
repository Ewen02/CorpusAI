'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@corpusai/ui';
import { LoaderIcon } from '@/lib/icons';
import { useTestWebhook, type WebhookDeliveryResult } from '@/lib/queries';

interface WebhookTestSenderProps {
  webhookId: string;
}

const TEST_EVENTS = [
  { value: 'document.indexed', labelKey: 'documentIndexed' as const },
  { value: 'document.failed', labelKey: 'documentFailed' as const },
  { value: 'conversation.started', labelKey: 'conversationStarted' as const },
  { value: 'ping', labelKey: 'ping' as const },
];

export function WebhookTestSender({ webhookId }: WebhookTestSenderProps) {
  const t = useTranslations('settings.webhooks.debugger');
  const [eventType, setEventType] = React.useState<string>('document.indexed');
  const [result, setResult] = React.useState<WebhookDeliveryResult | null>(null);
  const testWebhook = useTestWebhook();

  const handleSend = async () => {
    setResult(null);
    const res = await testWebhook.mutateAsync({ id: webhookId, eventType });
    setResult(res);
  };

  const resultMessage = React.useMemo(() => {
    if (!result) return null;
    if (result.success) {
      return {
        text: t('testSuccess', {
          statusCode: result.statusCode ?? '---',
          latencyMs: result.latencyMs,
        }),
        tone: 'success' as const,
      };
    }
    if (result.statusCode === null) {
      return { text: t('testFailureNoResponse'), tone: 'error' as const };
    }
    return {
      text: t('testFailure', { statusCode: result.statusCode }),
      tone: 'error' as const,
    };
  }, [result, t]);

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="text-base">{t('sendTestEvent')}</CardTitle>
        <CardDescription>{t('sendTestEventDescription')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Select value={eventType} onValueChange={setEventType}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder={t('selectEventType')} />
            </SelectTrigger>
            <SelectContent>
              {TEST_EVENTS.map((evt) => (
                <SelectItem key={evt.value} value={evt.value}>
                  {t(evt.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSend} disabled={testWebhook.isPending}>
            {testWebhook.isPending ? (
              <>
                <LoaderIcon className="mr-2 h-3.5 w-3.5 animate-spin" />
                {t('sending')}
              </>
            ) : (
              t('sendTest')
            )}
          </Button>
        </div>

        {resultMessage && (
          <p
            className={
              resultMessage.tone === 'success'
                ? 'text-xs font-medium text-green-400'
                : 'text-xs font-medium text-destructive'
            }
          >
            {resultMessage.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
