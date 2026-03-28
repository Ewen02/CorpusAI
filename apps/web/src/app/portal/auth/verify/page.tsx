'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@corpusai/ui';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function PortalVerifyPageWrapper() {
  return (
    <React.Suspense>
      <PortalVerifyPage />
    </React.Suspense>
  );
}

function PortalVerifyPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = React.useState<'redirecting' | 'error'>('redirecting');

  React.useEffect(() => {
    if (!token) {
      setStatus('error');
      return;
    }
    // Navigate directly to API endpoint — it sets the cookie and redirects to /portal/conversations
    window.location.href = `${API_URL}/portal/auth/verify?token=${encodeURIComponent(token)}`;
  }, [token]);

  if (status === 'error') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-xl font-semibold">Lien invalide ou expiré</h1>
          <p className="text-sm text-muted-foreground">
            Ce lien de connexion a expiré ou a déjà été utilisé.
          </p>
          <Button variant="outline" onClick={() => (window.location.href = '/portal/sign-in')}>
            Demander un nouveau lien
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Connexion en cours...</p>
    </div>
  );
}
