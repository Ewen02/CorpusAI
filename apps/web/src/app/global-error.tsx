'use client';

import * as Sentry from '@sentry/nextjs';
import * as React from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  React.useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen items-center justify-center bg-background font-sans antialiased">
        <div className="max-w-md space-y-4 p-8 text-center">
          <h1 className="text-xl font-semibold text-destructive">
            Une erreur critique est survenue
          </h1>
          <p className="text-sm text-muted-foreground">
            {error.message || "Une erreur inattendue s'est produite."}
          </p>
          <button
            onClick={reset}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
