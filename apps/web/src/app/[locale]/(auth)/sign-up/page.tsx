'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import {
  AuthLayout,
  AuthForm,
  AuthDivider,
  AuthLink,
  SocialButton,
  Button,
  Input,
  Label,
} from '@corpusai/ui';
import { authClient } from '@/lib/auth-client';
import { useRouter } from '@/i18n/routing';

export default function SignUpPage() {
  const t = useTranslations('auth.signUp');
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (password.length < 8) {
      setError(t('errorPasswordLength'));
      setIsLoading(false);
      return;
    }

    try {
      const { error: authError } = await authClient.signUp.email({
        email,
        password,
        name,
      });

      if (authError) {
        throw new Error(authError.message || t('errorGeneric'));
      }

      router.push('/onboarding');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'google' | 'github') => {
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: `${window.location.origin}/onboarding`,
      });
    } catch {
      setError(t('errorGeneric'));
    }
  };

  return (
    <AuthLayout
      title={t('title')}
      description={t('description')}
      showBackLink
      onBack={() => router.push('/')}
      footer={
        <p>
          {t('hasAccount')}{' '}
          <AuthLink href="/sign-in" onClick={() => router.push('/sign-in')}>
            {t('signIn')}
          </AuthLink>
        </p>
      }
    >
      <div className="space-y-4">
        <SocialButton provider="google" onClick={() => handleSocialAuth('google')} />
        <SocialButton provider="github" onClick={() => handleSocialAuth('github')} />
      </div>

      <AuthDivider />

      <AuthForm onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">{t('name')}</Label>
          <Input
            id="name"
            type="text"
            placeholder={t('namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">{t('email')}</Label>
          <Input
            id="email"
            type="email"
            placeholder={t('emailPlaceholder')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t('password')}</Label>
          <Input
            id="password"
            type="password"
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? t('submitting') : t('submit')}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          {t('agreeTerms')}{' '}
          <AuthLink href="/terms" onClick={() => router.push('/terms')}>
            {t('terms')}
          </AuthLink>{' '}
          {t('and')}{' '}
          <AuthLink href="/privacy" onClick={() => router.push('/privacy')}>
            {t('privacy')}
          </AuthLink>
        </p>
      </AuthForm>
    </AuthLayout>
  );
}
