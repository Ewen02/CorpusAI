'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Button,
  Input,
  Label,
  Badge,
  Separator,
} from '@corpusai/ui';
import {
  useWebhooks,
  useCreateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  type NewWebhook,
} from '@/lib/queries';
import {
  WebhookIcon,
  PlusIcon,
  XIcon,
  CopyIcon,
  LoaderIcon,
  TrashIcon,
  CheckIcon,
} from '@/lib/icons';
import { PageWrapper } from '@/components/page-wrapper';

const WEBHOOK_EVENTS = [
  'document.indexed',
  'document.failed',
  'conversation.started',
  'conversation.message.created',
] as const;

type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

const EVENT_LABEL_KEYS: Record<WebhookEvent, string> = {
  'document.indexed': 'documentIndexed',
  'document.failed': 'documentFailed',
  'conversation.started': 'conversationStarted',
  'conversation.message.created': 'messageCreated',
};

export default function SettingsWebhooksPage() {
  const t = useTranslations('webhooks');
  const tc = useTranslations('common');
  const locale = useLocale();
  const { data: webhooks, isLoading } = useWebhooks();
  const createWebhook = useCreateWebhook();
  const deleteWebhook = useDeleteWebhook();
  const testWebhook = useTestWebhook();

  const [url, setUrl] = React.useState('');
  const [selectedEvents, setSelectedEvents] = React.useState<string[]>([]);
  const [createdWebhook, setCreatedWebhook] = React.useState<NewWebhook | null>(null);
  const [copiedSecret, setCopiedSecret] = React.useState(false);
  const [testingId, setTestingId] = React.useState<string | null>(null);

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const handleCreate = async () => {
    if (!url || selectedEvents.length === 0) return;
    const result = await createWebhook.mutateAsync({ url, events: selectedEvents });
    setCreatedWebhook(result);
    setUrl('');
    setSelectedEvents([]);
  };

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      await testWebhook.mutateAsync(id);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <PageWrapper className="space-y-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <WebhookIcon className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create Webhook */}
          <div className="space-y-3">
            <Label>{t('createWebhook')}</Label>
            <Input
              placeholder={t('urlPlaceholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              type="url"
            />
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('selectEvents')}</Label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <button
                    key={event}
                    type="button"
                    onClick={() => toggleEvent(event)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selectedEvents.includes(event)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {t(EVENT_LABEL_KEYS[event])}
                  </button>
                ))}
              </div>
            </div>
            <Button
              onClick={handleCreate}
              disabled={createWebhook.isPending || !url || selectedEvents.length === 0}
            >
              <PlusIcon className="mr-2 h-4 w-4" />
              {createWebhook.isPending ? t('creating') : tc('create')}
            </Button>
          </div>

          {/* Newly Created Webhook (show secret once) */}
          {createdWebhook && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
              <p className="mb-2 text-sm font-medium text-green-500">{t('created')}</p>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">{t('secret')}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 break-all rounded bg-muted p-2 font-mono text-xs">
                    {createdWebhook.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopySecret(createdWebhook.secret)}
                  >
                    {copiedSecret ? (
                      <>
                        <CheckIcon className="mr-1 h-3 w-3" />
                        {t('copied')}
                      </>
                    ) : (
                      <>
                        <CopyIcon className="mr-1 h-3 w-3" />
                        {t('copy')}
                      </>
                    )}
                  </Button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setCreatedWebhook(null)}
              >
                {tc('close')}
              </Button>
            </div>
          )}

          <Separator />

          {/* Existing Webhooks */}
          <div>
            <h3 className="mb-3 text-sm font-medium">{t('events')}</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{tc('loading')}</p>
            ) : !webhooks || webhooks.length === 0 ? (
              <div className="py-8 text-center">
                <WebhookIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                <p className="text-sm font-medium text-muted-foreground">{t('noWebhooks')}</p>
                <p className="mt-1 text-xs text-muted-foreground">{t('noWebhooksDescription')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {webhooks.map((webhook) => (
                  <div key={webhook.id} className="rounded-lg border border-border bg-muted/30 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <code className="break-all text-sm font-medium">{webhook.url}</code>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {webhook.events.map((event) => (
                            <Badge key={event} variant="secondary" className="text-[10px]">
                              {t(EVENT_LABEL_KEYS[event as WebhookEvent] ?? event)}
                            </Badge>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {new Date(webhook.createdAt).toLocaleDateString(locale)}
                          {webhook.failureCount > 0 && (
                            <span className="ml-2 text-destructive">
                              {webhook.failureCount} {t('failures')}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTest(webhook.id)}
                          disabled={testingId === webhook.id}
                        >
                          {testingId === webhook.id ? (
                            <>
                              <LoaderIcon className="mr-1 h-3 w-3 animate-spin" />
                              {t('testing')}
                            </>
                          ) : (
                            t('test')
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => deleteWebhook.mutate(webhook.id)}
                          disabled={deleteWebhook.isPending}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Last Deliveries */}
                    {webhook.deliveries.length > 0 && (
                      <div className="mt-3 border-t border-border pt-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">
                          {t('lastDeliveries')}
                        </p>
                        <div className="space-y-1">
                          {webhook.deliveries.map((delivery) => (
                            <div
                              key={delivery.id}
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                              <span
                                className={`h-1.5 w-1.5 rounded-full ${
                                  delivery.success ? 'bg-green-500' : 'bg-destructive'
                                }`}
                              />
                              <span className="font-mono">{delivery.statusCode ?? '---'}</span>
                              <span>{delivery.eventType}</span>
                              <span className="ml-auto">
                                {new Date(delivery.createdAt).toLocaleString(locale)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
