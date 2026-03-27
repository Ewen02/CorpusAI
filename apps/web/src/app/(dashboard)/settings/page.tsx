'use client';

import * as React from 'react';
import {
  Button,
  Input,
  Textarea,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from '@corpusai/ui';
import { authClient } from '@/lib/auth-client';
import { apiClient } from '@/lib/api-client';
import type { User } from '@corpusai/types';
import { PageWrapper } from '@/components/page-wrapper';

export default function SettingsProfilePage() {
  const { data: session } = authClient.useSession();
  const [profile, setProfile] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [name, setName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiClient.get<User>('/users/me');
        setProfile(data);
        setName(data.name || '');
        setUsername(data.username || '');
        setBio(data.bio || '');
        setImageUrl(data.image || '');
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchProfile();
    }
  }, [session]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      const updated = await apiClient.patch<User>('/users/me', {
        name: name || undefined,
        username: username || undefined,
        bio: bio || undefined,
        image: imageUrl || undefined,
      });
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
      setSuccess('Profil mis à jour avec succès');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageWrapper className="space-y-6">
      {/* Profile Card */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>
            Gérez vos informations personnelles.
            {profile?.username && (
              <a
                href={`/u/${profile.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-[hsl(var(--accent-500))] hover:underline"
              >
                Voir mon profil public →
              </a>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 ring-2 ring-[hsl(var(--accent-500)/0.2)]">
                <AvatarImage src={imageUrl || profile?.image || undefined} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-400/20 to-indigo-600/10 text-2xl font-semibold text-indigo-400">
                  {name?.charAt(0)?.toUpperCase() ||
                    profile?.email?.charAt(0)?.toUpperCase() ||
                    'U'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-[13px] font-medium text-tx-primary">Photo de profil</p>
                <p className="text-[12px] text-tx-disabled">JPG, PNG ou GIF. Max 2MB.</p>
              </div>
            </div>

            <div className="border-t border-[hsl(var(--border-subtle))]" />

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[13px] font-medium text-tx-secondary">
                Nom complet
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                maxLength={100}
                className="h-9 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-[13px] font-medium text-tx-secondary">
                Nom d&apos;utilisateur
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-tx-disabled">corpusai.io/u/</span>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                  }
                  placeholder="monpseudo"
                  maxLength={30}
                  className="h-9 flex-1 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
                />
              </div>
              <p className="text-[12px] text-tx-disabled">
                3 à 30 caractères. Lettres, chiffres, tirets et underscores.
              </p>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-[13px] font-medium text-tx-secondary">
                Bio
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Décrivez votre activité en quelques mots"
                maxLength={160}
                rows={2}
                className="border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
              />
              <p className="text-right text-[12px] text-tx-disabled">{bio.length}/160</p>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium text-tx-secondary">
                Email
              </Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="h-9 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] text-[13px] text-tx-muted"
              />
              <p className="text-[12px] text-tx-disabled">L&apos;email ne peut pas être modifié.</p>
            </div>

            {/* Image URL */}
            <div className="space-y-1.5">
              <Label htmlFor="imageUrl" className="text-[13px] font-medium text-tx-secondary">
                URL de l&apos;avatar
              </Label>
              <Input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="h-9 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
              />
            </div>

            {/* Messages */}
            {error && (
              <div className="animate-fade-in-up rounded-lg bg-[hsl(var(--danger)/0.1)] p-3 text-[13px] text-[hsl(var(--danger))]">
                {error}
              </div>
            )}
            {success && (
              <div className="animate-fade-in-up rounded-lg bg-[hsl(var(--success)/0.1)] p-3 text-[13px] text-[hsl(var(--success))]">
                {success}
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-gradient-to-r from-indigo-500 to-indigo-600 shadow-[0_2px_8px_hsl(var(--accent-500)/0.35)] hover:opacity-90"
              >
                {isSaving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Info Card */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Informations du compte</CardTitle>
          <CardDescription>Détails de votre compte CorpusAI.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[12px] text-tx-disabled">ID du compte</p>
              <p className="mt-0.5 font-mono text-[13px] text-tx-primary">
                {profile?.id?.slice(0, 8)}...
              </p>
            </div>
            <div>
              <p className="text-[12px] text-tx-disabled">Date d&apos;inscription</p>
              <p className="mt-0.5 text-[13px] text-tx-primary">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-tx-disabled">Plan</p>
              <p className="mt-0.5 text-[13px] font-medium text-tx-primary">
                {profile?.subscriptionPlan || 'FREE'}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-tx-disabled">Statut</p>
              <p className="mt-0.5 text-[13px] text-tx-primary">
                {profile?.subscriptionStatus || 'Actif'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-[hsl(var(--danger)/0.2)] bg-[hsl(var(--danger)/0.04)] backdrop-blur">
        <CardHeader>
          <CardTitle className="text-[hsl(var(--danger))]">Zone de danger</CardTitle>
          <CardDescription>Actions irréversibles sur votre compte.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AccountDeletionSection />
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

function AccountDeletionSection() {
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleDelete = async () => {
    if (confirmText !== 'SUPPRIMER') return;
    setIsDeleting(true);
    setError(null);

    try {
      await apiClient.delete('/users/me');
      window.location.href = '/sign-in';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      setIsDeleting(false);
    }
  };

  if (!showConfirm) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-tx-primary">Supprimer le compte</p>
          <p className="mt-0.5 text-[12px] text-tx-muted">
            Supprimez définitivement votre compte et toutes vos données.
          </p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setShowConfirm(true)}>
          Supprimer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[hsl(var(--danger)/0.2)] bg-[hsl(var(--danger)/0.08)] p-4">
        <p className="text-[13px] font-medium text-[hsl(var(--danger))]">
          Cette action est irréversible !
        </p>
        <p className="mt-1 text-[12px] text-tx-muted">
          Toutes vos données (AIs, documents, conversations) seront supprimées définitivement.
        </p>
        <p className="mt-3 text-[13px] text-tx-secondary">
          Tapez <strong>SUPPRIMER</strong> pour confirmer :
        </p>
        <div className="mt-2 flex gap-2">
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="SUPPRIMER"
            className="h-9 max-w-[200px] border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] font-mono text-[13px]"
          />
          <Button
            variant="destructive"
            size="sm"
            disabled={confirmText !== 'SUPPRIMER' || isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? 'Suppression...' : 'Confirmer'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowConfirm(false);
              setConfirmText('');
            }}
          >
            Annuler
          </Button>
        </div>
        {error && <p className="mt-2 text-[12px] text-[hsl(var(--danger))]">{error}</p>}
      </div>
    </div>
  );
}
