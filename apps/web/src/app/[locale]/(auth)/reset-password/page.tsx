'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AuthLayout, AuthForm, Button, Input, Label } from '@corpusai/ui';
import { useRouter } from '@/i18n/routing';
import { authClient } from '@/lib/auth-client';

export default function ResetPasswordPage() {
  return (
    <React.Suspense>
      <ResetPasswordContent />
    </React.Suspense>
  );
}

function ResetPasswordContent() {
  const t = useTranslations('resetPassword');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError(t('errorMismatch'));
      return;
    }
    if (password.length < 8) {
      setError(t('errorMinLength'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authClient.resetPassword({ newPassword: password, token });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout
        title={t('invalidLink')}
        description={t('invalidDescription')}
        showBackLink
        onBack={() => router.push('/forgot-password')}
      >
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push('/forgot-password')}
        >
          {t('requestNew')}
        </Button>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout
        title={t('success')}
        description={t('successDescription')}
        showBackLink
        onBack={() => router.push('/sign-in')}
      >
        <Button className="w-full" onClick={() => router.push('/sign-in')}>
          {t('signIn')}
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
    >
      <AuthForm onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">{t('newPassword')}</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-password">{t('confirmPassword')}</Label>
          <Input
            id="confirm-password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
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
