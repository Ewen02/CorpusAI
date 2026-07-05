'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
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
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type { User } from '@corpusai/types';
import { useUserProfile, userKeys } from '@/lib/queries';
import { PageWrapper } from '@/components/page-wrapper';

export default function SettingsProfilePage() {
  const t = useTranslations('settings');
  const locale = useLocale();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useUserProfile();
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [name, setName] = React.useState('');
  const [username, setUsername] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [imageUrl, setImageUrl] = React.useState('');

  // Seed the editable form fields once the profile has loaded.
  React.useEffect(() => {
    if (!profile) return;
    setName(profile.name || '');
    setUsername(profile.username || '');
    setBio(profile.bio || '');
    setImageUrl(profile.image || '');
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsSaving(true);

    try {
      await apiClient.patch<User>('/users/me', {
        name: name || undefined,
        username: username || undefined,
        bio: bio || undefined,
        image: imageUrl || undefined,
      });
      await queryClient.invalidateQueries({ queryKey: userKeys.profile() });
      setSuccess(t('saved'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'));
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
          <CardTitle>{t('profile')}</CardTitle>
          <CardDescription>
            {t('profileDescription')}
            {profile?.username && (
              <a
                href={`/u/${profile.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-[hsl(var(--accent-500))] hover:underline"
              >
                {t('viewProfile')} →
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
                <p className="text-[13px] font-medium text-tx-primary">{t('profilePicture')}</p>
                <p className="text-[12px] text-tx-disabled">{t('profilePictureHint')}</p>
              </div>
            </div>

            <div className="border-t border-[hsl(var(--border-subtle))]" />

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[13px] font-medium text-tx-secondary">
                {t('name')}
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('namePlaceholder')}
                maxLength={100}
                className="h-9 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-[13px] font-medium text-tx-secondary">
                {t('username')}
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-tx-disabled">corpusai.io/u/</span>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
                  }
                  placeholder={t('usernamePlaceholder')}
                  maxLength={30}
                  className="h-9 flex-1 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
                />
              </div>
              <p className="text-[12px] text-tx-disabled">{t('usernameHint')}</p>
            </div>

            {/* Bio */}
            <div className="space-y-1.5">
              <Label htmlFor="bio" className="text-[13px] font-medium text-tx-secondary">
                {t('bio')}
              </Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('bioPlaceholder')}
                maxLength={160}
                rows={2}
                className="border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] text-[13px] text-tx-primary placeholder:text-tx-disabled focus:border-[hsl(var(--accent-500)/0.4)] focus:ring-1 focus:ring-[hsl(var(--accent-500)/0.15)]"
              />
              <p className="text-right text-[12px] text-tx-disabled">{bio.length}/160</p>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[13px] font-medium text-tx-secondary">
                {t('email')}
              </Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="h-9 border-[hsl(var(--border-default))] bg-[hsl(var(--surface-2))] text-[13px] text-tx-muted"
              />
              <p className="text-[12px] text-tx-disabled">{t('emailReadonly')}</p>
            </div>

            {/* Image URL */}
            <div className="space-y-1.5">
              <Label htmlFor="imageUrl" className="text-[13px] font-medium text-tx-secondary">
                {t('avatarUrl')}
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
                className="bg-primary shadow-[0_2px_8px_hsl(var(--accent-500)/0.35)] hover:opacity-90"
              >
                {isSaving ? t('saving') : t('save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account Info Card */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('accountInfo')}</CardTitle>
          <CardDescription>{t('accountInfoDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[12px] text-tx-disabled">{t('accountId')}</p>
              <p className="mt-0.5 font-mono text-[13px] text-tx-primary">
                {profile?.id?.slice(0, 8)}...
              </p>
            </div>
            <div>
              <p className="text-[12px] text-tx-disabled">{t('registrationDate')}</p>
              <p className="mt-0.5 text-[13px] text-tx-primary">
                {profile?.createdAt
                  ? new Date(profile.createdAt).toLocaleDateString(locale, {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '-'}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-tx-disabled">{t('plan')}</p>
              <p className="mt-0.5 text-[13px] font-medium text-tx-primary">
                {profile?.subscriptionPlan || 'FREE'}
              </p>
            </div>
            <div>
              <p className="text-[12px] text-tx-disabled">{t('status')}</p>
              <p className="mt-0.5 text-[13px] text-tx-primary">
                {profile?.subscriptionStatus || t('statusActive')}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-[hsl(var(--danger)/0.2)] bg-[hsl(var(--danger)/0.04)] backdrop-blur">
        <CardHeader>
          <CardTitle className="text-[hsl(var(--danger))]">{t('dangerZone')}</CardTitle>
          <CardDescription>{t('dangerZoneDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AccountDeletionSection />
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

function AccountDeletionSection() {
  const t = useTranslations('settings');
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState('');
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const confirmWord = t('deleteConfirmWord');

  const handleDelete = async () => {
    if (confirmText !== confirmWord) return;
    setIsDeleting(true);
    setError(null);

    try {
      await apiClient.delete('/users/me');
      window.location.href = '/sign-in';
    } catch (err) {
      setError(err instanceof Error ? err.message : t('deleteError'));
      setIsDeleting(false);
    }
  };

  if (!showConfirm) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[13px] font-medium text-tx-primary">{t('deleteAccount')}</p>
          <p className="mt-0.5 text-[12px] text-tx-muted">{t('deleteAccountDescription')}</p>
        </div>
        <Button variant="destructive" size="sm" onClick={() => setShowConfirm(true)}>
          {t('deleteButton')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[hsl(var(--danger)/0.2)] bg-[hsl(var(--danger)/0.08)] p-4">
        <p className="text-[13px] font-medium text-[hsl(var(--danger))]">
          {t('deleteIrreversible')}
        </p>
        <p className="mt-1 text-[12px] text-tx-muted">{t('deleteWarning')}</p>
        <p className="mt-3 text-[13px] text-tx-secondary">
          {t.rich('deleteConfirmPrompt', {
            strong: (chunks) => <strong>{chunks}</strong>,
          })}
        </p>
        <div className="mt-2 flex gap-2">
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmWord}
            className="h-9 max-w-[200px] border-[hsl(var(--border-default))] bg-[hsl(var(--surface-1))] font-mono text-[13px]"
          />
          <Button
            variant="destructive"
            size="sm"
            disabled={confirmText !== confirmWord || isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? t('deleting') : t('confirm')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setShowConfirm(false);
              setConfirmText('');
            }}
          >
            {t('cancel')}
          </Button>
        </div>
        {error && <p className="mt-2 text-[12px] text-[hsl(var(--danger))]">{error}</p>}
      </div>
    </div>
  );
}
