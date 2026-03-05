'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthLayout, AuthForm, Button, Input, Label } from '@corpusai/ui';
import { authClient } from '@/lib/auth-client';

export default function ResetPasswordPage() {
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
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caracteres');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await authClient.resetPassword({ newPassword: password, token });
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la reinitialisation');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthLayout
        title="Lien invalide"
        description="Ce lien de reinitialisation est invalide ou a expire."
        showBackLink
        onBack={() => router.push('/forgot-password')}
      >
        <Button
          variant="outline"
          className="w-full"
          onClick={() => router.push('/forgot-password')}
        >
          Demander un nouveau lien
        </Button>
      </AuthLayout>
    );
  }

  if (success) {
    return (
      <AuthLayout
        title="Mot de passe modifie"
        description="Votre mot de passe a ete reinitialise avec succes."
        showBackLink
        onBack={() => router.push('/sign-in')}
      >
        <Button className="w-full" onClick={() => router.push('/sign-in')}>
          Se connecter
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Nouveau mot de passe"
      description="Choisissez un nouveau mot de passe pour votre compte"
      showBackLink
      onBack={() => router.push('/sign-in')}
    >
      <AuthForm onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="space-y-2">
          <Label htmlFor="password">Nouveau mot de passe</Label>
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
          <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
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
          {isLoading ? 'Reinitialisation...' : 'Reinitialiser le mot de passe'}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}
