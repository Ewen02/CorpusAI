'use client';

import * as React from 'react';
import { Button, Card, CardContent, CardHeader, CardTitle, CardDescription } from '@corpusai/ui';

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorBoundaryProps) {
  React.useEffect(() => {
    // Log the error to an error reporting service
    console.error('Dashboard error:', error);
  }, [error]);

  return (
    <div className="container py-8">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle className="text-destructive">Une erreur est survenue</CardTitle>
          <CardDescription>
            Nous sommes desoles, une erreur inattendue s&apos;est produite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error.message || 'Une erreur inconnue est survenue.'}
          </p>
          <div className="flex gap-2">
            <Button onClick={reset}>Reessayer</Button>
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
              Retour au dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
