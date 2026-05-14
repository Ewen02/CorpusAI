'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button, Input, Label } from '@corpusai/ui';
import { useSendMagicLink } from '@/lib/queries';
import { emailSchema } from '@/lib/schemas';

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
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [sent, setSent] = React.useState(false);
  const { mutate: sendMagicLink, isPending } = useSendMagicLink();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = emailSchema.safeParse({ email });
    if (!parsed.success) {
      setEmailError(parsed.error.issues[0]?.message ?? 'Invalid email');
      return;
    }
    setEmailError(null);
    if (callbackUrl) {
      sessionStorage.setItem('portal_callback_url', callbackUrl);
    }
    sendMagicLink(
      { email: parsed.data.email, aiSlug: aiSlug ?? undefined },
      { onSuccess: () => setSent(true) }
    );
  };

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm space-y-4 text-center">
          <div className="text-4xl">✉️</div>
          <h1 className="text-xl font-semibold">{t('sent')}</h1>
          <p className="text-sm text-muted-foreground">
            {t.rich('sentDescription', {
              email,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
          </p>
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
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(null);
              }}
              aria-invalid={emailError ? 'true' : undefined}
              aria-describedby={emailError ? 'email-error' : undefined}
              required
              disabled={isPending}
            />
            {emailError && (
              <p id="email-error" className="text-xs text-[hsl(var(--danger))]">
                {emailError}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? t('submitting') : t('submit')}
          </Button>
        </form>
      </div>
    </div>
  );
}
