'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AuthLayout, AuthForm, AuthLink, Button, Input, Label } from '@corpusai/ui';
import { useRouter } from '@/i18n/routing';

export default function ForgotPasswordPage() {
  const t = useTranslations('auth.forgotPassword');
  const tSignIn = useTranslations('auth.signIn');
  const router = useRouter();
  const [email, setEmail] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [sent, setSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseURL}/auth/forget-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || t('errorGeneric'));
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title={t('sent')}
        description={t('sentDescription')}
        showBackLink
        onBack={() => router.push('/sign-in')}
      >
        <Button variant="outline" className="w-full" onClick={() => router.push('/sign-in')}>
          {t('backToSignIn')}
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('title')}
      description={t('description')}
      showBackLink
      onBack={() => router.push('/sign-in')}
      footer={
        <p>
          {tSignIn('noAccount')}{' '}
          <AuthLink href="/sign-in" onClick={() => router.push('/sign-in')}>
            {tSignIn('submit')}
          </AuthLink>
        </p>
      }
    >
      <AuthForm onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('submitting') : t('submit')}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}
