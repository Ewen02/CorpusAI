'use client';

import * as Sentry from '@sentry/nextjs';
import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@corpusai/ui';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorBoundaryProps) {
  const t = useTranslations('error');

  React.useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="container py-8">
      <Card className="mx-auto max-w-lg">
        <CardHeader>
          <CardTitle className="text-destructive">{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{error.message || t('unknownError')}</p>
          <div className="flex gap-2">
            <Button onClick={reset}>{t('retry')}</Button>
            <Button variant="outline" onClick={() => (window.location.href = '/dashboard')}>
              {t('backToDashboard')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
