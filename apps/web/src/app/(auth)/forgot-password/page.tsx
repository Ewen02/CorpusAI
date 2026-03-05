'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { AuthLayout, AuthForm, AuthLink, Button, Input, Label } from '@corpusai/ui';

export default function ForgotPasswordPage() {
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
        throw new Error(data?.message || "Erreur lors de l'envoi");
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
    } finally {
      setIsLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthLayout
        title="Email envoye"
        description="Si un compte existe avec cette adresse, vous recevrez un lien de reinitialisation."
        showBackLink
        onBack={() => router.push('/sign-in')}
      >
        <Button variant="outline" className="w-full" onClick={() => router.push('/sign-in')}>
          Retour a la connexion
        </Button>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Mot de passe oublie"
      description="Entrez votre email pour recevoir un lien de reinitialisation"
      showBackLink
      onBack={() => router.push('/sign-in')}
      footer={
        <p>
          Vous vous souvenez ?{' '}
          <AuthLink href="/sign-in" onClick={() => router.push('/sign-in')}>
            Se connecter
          </AuthLink>
        </p>
      }
    >
      <AuthForm onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="vous@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Envoi...' : 'Envoyer le lien'}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}
