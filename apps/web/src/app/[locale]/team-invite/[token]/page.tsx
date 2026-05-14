'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@corpusai/ui';
import { useAcceptCollaboratorInvite } from '@/lib/queries';
import { useRouter } from '@/i18n/routing';
import { authClient } from '@/lib/auth-client';
import { ApiError } from '@/lib/api-client';
import { reportError } from '@/lib/log';

type Status =
  | { kind: 'loading' }
  | { kind: 'needsAuth' }
  | { kind: 'success'; aiId: string; aiSlug: string }
  | { kind: 'error'; messageKey: string };

export default function TeamInviteAcceptPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const t = useTranslations('ai.team.accept');
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();
  const accept = useAcceptCollaboratorInvite();

  const [status, setStatus] = React.useState<Status>({ kind: 'loading' });
  const attempted = React.useRef(false);

  React.useEffect(() => {
    if (sessionPending || attempted.current) return;

    if (!session) {
      setStatus({ kind: 'needsAuth' });
      return;
    }

    attempted.current = true;
    accept
      .mutateAsync(token)
      .then((response) => {
        setStatus({ kind: 'success', aiId: response.aiId, aiSlug: response.aiSlug });
        setTimeout(() => router.replace(`/ais/${response.aiId}`), 1200);
      })
      .catch((err) => {
        const messageKey = mapErrorToKey(err);
        if (messageKey === 'errorGeneric') {
          reportError('Failed to accept collaborator invite', err, { token });
        }
        setStatus({ kind: 'error', messageKey });
      });
  }, [session, sessionPending, token, accept, router]);

  const handleSignIn = () => {
    const callback = `/team-invite/${token}`;
    router.push(`/sign-in?callbackUrl=${encodeURIComponent(callback)}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.kind === 'loading' && <p className="text-sm text-tx-muted">{t('loading')}</p>}

          {status.kind === 'needsAuth' && (
            <>
              <p className="text-sm text-tx-secondary">{t('loginRequired')}</p>
              <Button onClick={handleSignIn} className="w-full">
                {t('signIn')}
              </Button>
            </>
          )}

          {status.kind === 'success' && (
            <p className="text-sm text-[hsl(var(--success))]">{t('success')}</p>
          )}

          {status.kind === 'error' && (
            <p className="text-sm text-[hsl(var(--danger))]">{t(status.messageKey)}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function mapErrorToKey(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 404) return 'errorNotFound';
    if (err.status === 410) return 'errorExpired';
    if (err.status === 409) return 'errorAlreadyAccepted';
    if (err.status === 403) return 'errorWrongEmail';
  }
  return 'errorGeneric';
}
