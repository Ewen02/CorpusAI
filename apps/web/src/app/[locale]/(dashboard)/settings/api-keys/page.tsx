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
import { useApiKeys, useCreateApiKey, useDeleteApiKey, type NewApiKey } from '@/lib/queries';
import { useCopyToClipboard } from '@/lib/hooks';
import { KeyIcon, PlusIcon, XIcon } from '@/lib/icons';
import { PageWrapper } from '@/components/page-wrapper';

export default function SettingsApiKeysPage() {
  const t = useTranslations('apiKeys');
  const tc = useTranslations('common');
  const ta = useTranslations('a11y');
  const locale = useLocale();
  const { data: keys, isLoading } = useApiKeys();
  const createKey = useCreateApiKey();
  const deleteKey = useDeleteApiKey();

  const [newKeyName, setNewKeyName] = React.useState('');
  const [createdKey, setCreatedKey] = React.useState<NewApiKey | null>(null);
  const { copied, copy } = useCopyToClipboard();

  const handleCreate = async () => {
    const result = await createKey.mutateAsync(newKeyName || 'Default');
    setCreatedKey(result);
    setNewKeyName('');
  };

  const handleCopy = () => {
    if (createdKey) copy(createdKey.key);
  };

  return (
    <PageWrapper className="space-y-6">
      <Card variant="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyIcon className="h-5 w-5" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create Key */}
          <div className="space-y-3">
            <Label>{t('newKey')}</Label>
            <div className="flex gap-2">
              <Input
                placeholder={t('keyNamePlaceholder')}
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="max-w-xs"
              />
              <Button onClick={handleCreate} disabled={createKey.isPending}>
                <PlusIcon className="mr-2 h-4 w-4" />
                {createKey.isPending ? t('creating') : tc('create')}
              </Button>
            </div>
          </div>

          {/* Newly Created Key (show once) */}
          {createdKey && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-4">
              <p className="mb-2 text-sm font-medium text-green-500">{t('keyCreated')}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-muted p-2 font-mono text-xs">
                  {createdKey.key}
                </code>
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? t('copied') : t('copy')}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2"
                onClick={() => setCreatedKey(null)}
              >
                {tc('close')}
              </Button>
            </div>
          )}

          <Separator />

          {/* Existing Keys */}
          <div>
            <h3 className="mb-3 text-sm font-medium">{t('existingKeys')}</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">{tc('loading')}</p>
            ) : !keys || keys.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('noKeys')}</p>
            ) : (
              <div className="space-y-2">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className="flex items-center justify-between rounded-lg bg-[hsl(var(--surface-2))] p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{key.name}</p>
                        <code className="font-mono text-xs text-muted-foreground">
                          {key.prefix}...
                        </code>
                      </div>
                      <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                        <span>
                          {t('createdOn', {
                            date: new Date(key.createdAt).toLocaleDateString(locale),
                          })}
                        </span>
                        {key.lastUsedAt && (
                          <span>
                            {t('lastUsed', {
                              date: new Date(key.lastUsedAt).toLocaleDateString(locale),
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteKey.mutate(key.id)}
                      disabled={deleteKey.isPending}
                      aria-label={ta('deleteApiKey')}
                    >
                      <XIcon className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('apiDocs')}</CardTitle>
          <CardDescription>{t('apiDocsDescription')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="mb-2 text-sm font-medium">{t('listAIs')}</h4>
              <pre className="overflow-x-auto rounded-lg bg-[hsl(var(--surface-2))] p-3 font-mono text-xs">
                {`curl -H "Authorization: Bearer cai_votre_cle" \\
  ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/ais`}
              </pre>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium">{t('askQuestion')}</h4>
              <pre className="overflow-x-auto rounded-lg bg-[hsl(var(--surface-2))] p-3 font-mono text-xs">
                {`curl -X POST \\
  -H "Authorization: Bearer cai_votre_cle" \\
  -H "Content-Type: application/json" \\
  -d '{"slug": "mon-ai", "question": "Votre question ?"}' \\
  ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/v1/query`}
              </pre>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-medium">{t('response')}</h4>
              <pre className="overflow-x-auto rounded-lg bg-[hsl(var(--surface-2))] p-3 font-mono text-xs">
                {`{
  "answer": "${t('generatedResponse')}",
  "sources": [
    { "content": "...", "score": 0.92, "metadata": {...} }
  ],
  "confidence": "HIGH",
  "tokenUsage": 450
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
