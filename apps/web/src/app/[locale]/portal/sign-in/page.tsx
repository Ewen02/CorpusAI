'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Input, Label } from '@corpusai/ui';
import { useSendMagicLink } from '@/lib/queries';

export default function PortalSignInPageWrapper() {
  return (
    <React.Suspense>
      <PortalSignInPage />
    </React.Suspense>
  );
}

function PortalSignInPage() {
  const t = useTranslations('portal.signIn');
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const aiSlug = searchParams.get('aiSlug');

  const [email, setEmail] = React.useState('');
  const [sent, setSent] = React.useState(false);
  const { mutate: sendMagicLink, isPending } = useSendMagicLink();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Store callbackUrl so we can redirect after verify
    if (callbackUrl) {
      sessionStorage.setItem('portal_callback_url', callbackUrl);
    }
    sendMagicLink({ email, aiSlug: aiSlug ?? undefined }, { onSuccess: () => setSent(true) });
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="text-4xl">✉️</div>
          <h1 className="text-xl font-semibold">{t('sent')}</h1>
          <p
            className="text-sm text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: t('sentDescription', { email }) }}
          />
          <button
            className="text-sm text-primary underline underline-offset-4"
            onClick={() => setSent(false)}
          >
            {t('resend')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder={t('emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isPending}
            />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? t('submitting') : t('submit')}
          </Button>
        </form>
      </div>
    </div>
  );
}
