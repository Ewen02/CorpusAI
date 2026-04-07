'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
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

export default function SignInPage() {
  const t = useTranslations('auth.signIn');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, isPending } = authClient.useSession();
  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

  const rawCallbackUrl = searchParams?.get('callbackUrl') ?? null;
  const callbackPath = React.useMemo(() => {
    if (!rawCallbackUrl) return '/dashboard';
    // Strip /{locale} prefix so next-intl router can handle it
    const stripped = rawCallbackUrl.replace(/^\/(fr|en)(?=\/|$)/, '') || '/dashboard';
    return stripped;
  }, [rawCallbackUrl]);

  // If already signed in, redirect out of /sign-in
  React.useEffect(() => {
    if (!isPending && session) {
      router.replace(callbackPath);
    }
  }, [isPending, session, callbackPath, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { error: authError } = await authClient.signIn.email({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message || t('errorGeneric'));
      }

      router.push(callbackPath);
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
        callbackURL: `${window.location.origin}${callbackPath}`,
      });
    } catch {
      setError(t('errorSocial', { provider }));
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
          {t('noAccount')}{' '}
          <AuthLink href="/sign-up" onClick={() => router.push('/sign-up')}>
            {t('createAccount')}
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{t('password')}</Label>
            <AuthLink href="/forgot-password" onClick={() => router.push('/forgot-password')}>
              {t('forgotPassword')}
            </AuthLink>
          </div>
          <Input
            id="password"
            type="password"
            placeholder={t('passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
