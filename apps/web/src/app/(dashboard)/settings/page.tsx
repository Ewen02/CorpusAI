'use client';

import * as React from 'react';
import {
  Button,
  Input,
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
  Separator,
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

  // Form state
  const [name, setName] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');

  React.useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await apiClient.get<User>('/users/me');
        setProfile(data);
        setName(data.name || '');
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
        image: imageUrl || undefined,
      });
      setProfile((prev) => (prev ? { ...prev, ...updated } : prev));
      setSuccess('Profil mis a jour avec succes');
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
          <CardDescription>Gérez vos informations personnelles.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 ring-2 ring-primary/20">
                <AvatarImage src={imageUrl || profile?.image || undefined} />
                <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
                  {name?.charAt(0)?.toUpperCase() ||
                    profile?.email?.charAt(0)?.toUpperCase() ||
                    'U'}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm font-medium">Photo de profil</p>
                <p className="text-xs text-muted-foreground">JPG, PNG ou GIF. Max 2MB.</p>
              </div>
            </div>

            <Separator />

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name">Nom complet</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Votre nom"
                maxLength={100}
              />
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" value={profile?.email || ''} disabled className="bg-muted" />
              <p className="text-xs text-muted-foreground">
                L&apos;email ne peut pas être modifié.
              </p>
            </div>

            {/* Image URL */}
            <div className="space-y-2">
              <Label htmlFor="imageUrl">URL de l&apos;avatar</Label>
              <Input
                id="imageUrl"
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
              />
            </div>

            {/* Messages */}
            {error && (
              <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-500">{success}</div>
            )}

            {/* Submit */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
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
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">ID du compte</p>
              <p className="font-mono">{profile?.id?.slice(0, 8)}...</p>
            </div>
            <div>
              <p className="text-muted-foreground">Date d&apos;inscription</p>
              <p>
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
              <p className="text-muted-foreground">Plan</p>
              <p className="font-medium">{profile?.subscriptionPlan || 'FREE'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Statut</p>
              <p>{profile?.subscriptionStatus || 'Actif'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/20 bg-destructive/5 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-destructive">Zone de danger</CardTitle>
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
          <p className="font-medium">Supprimer le compte</p>
          <p className="text-sm text-muted-foreground">
            Supprimez définitivement votre compte et toutes vos données.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setShowConfirm(true)}>
          Supprimer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
        <p className="font-medium text-destructive">Cette action est irréversible !</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Toutes vos données (AIs, documents, conversations) seront supprimées définitivement.
        </p>
        <p className="mt-3 text-sm">
          Tapez <strong>SUPPRIMER</strong> pour confirmer :
        </p>
        <div className="mt-2 flex gap-2">
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="SUPPRIMER"
            className="max-w-[200px]"
          />
          <Button
            variant="destructive"
            disabled={confirmText !== 'SUPPRIMER' || isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? 'Suppression...' : 'Confirmer'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowConfirm(false);
              setConfirmText('');
            }}
          >
            Annuler
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
