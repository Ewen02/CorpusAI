'use client';

import * as React from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Skeleton,
  Separator,
} from '@corpusai/ui';
import { authClient } from '@/lib/auth-client';
import { apiClient } from '@/lib/api-client';
import { useFormState } from '@/lib/hooks';
import { getProviderInfo } from '@/lib/constants';
import { DeviceIcon, ShieldIcon } from '@/lib/icons';
import { PageWrapper } from '@/components/page-wrapper';

interface AccountInfo {
  providerId: string;
  createdAt: string;
}

export default function SettingsSecurityPage() {
  const t = useTranslations('security');
  const locale = useLocale();
  const { data: session } = authClient.useSession();
  const [accounts, setAccounts] = React.useState<AccountInfo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');

  const formState = useFormState();

  React.useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await apiClient.get<AccountInfo[]>('/users/me/accounts');
        setAccounts(data);
      } catch (err) {
        console.error('Error fetching accounts:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchAccounts();
    } else {
      setIsLoading(false);
    }
  }, [session]);

  // Check if user has password auth
  const hasPasswordAuth = accounts.some((a) => a.providerId === 'credential');
  const oauthAccounts = accounts.filter((a) => a.providerId !== 'credential');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    formState.clearMessages();

    if (newPassword !== confirmPassword) {
      formState.setError(t('errorMismatch'));
      return;
    }

    if (newPassword.length < 8) {
      formState.setError(t('errorMinLength'));
      return;
    }

    formState.setLoading(true);

    try {
      const { error: authError } = await authClient.changePassword({
        currentPassword,
        newPassword,
      });
      if (authError) {
        throw new Error(authError.message || t('errorGeneric'));
      }
      formState.setSuccess(t('passwordChanged'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      formState.setError(err instanceof Error ? err.message : t('errorGeneric'));
    } finally {
      formState.setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageWrapper className="space-y-6">
      {/* Authentication Method */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('loginMethod')}</CardTitle>
          <CardDescription>{t('loginMethodDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noMethod')}</p>
          ) : (
            accounts.map((account, idx) => {
              const provider = getProviderInfo(account.providerId);
              return (
                <React.Fragment key={account.providerId}>
                  {idx > 0 && <Separator />}
                  <div className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-3">
                      <div className={provider.color}>{provider.icon}</div>
                      <div>
                        <p className="font-medium">{provider.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {t('connectedOn')}{' '}
                          {new Date(account.createdAt).toLocaleDateString(locale, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">{t('active')}</Badge>
                  </div>
                </React.Fragment>
              );
            })
          )}

          {oauthAccounts.length > 0 && !hasPasswordAuth && (
            <div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
              <p>
                {t('oauthOnly', {
                  providers: oauthAccounts
                    .map((a) => getProviderInfo(a.providerId).name)
                    .join(', '),
                })}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Change - Only show if user has password auth */}
      {hasPasswordAuth && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>{t('password')}</CardTitle>
            <CardDescription>{t('passwordDescription')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="max-w-md space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t('currentPassword')}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">{t('newPassword')}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {formState.error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {formState.error}
                </div>
              )}
              {formState.success && (
                <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-500">
                  {formState.success}
                </div>
              )}

              <Button type="submit" disabled={formState.isLoading}>
                {formState.isLoading ? t('changing') : t('changePassword')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Sessions */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>{t('sessions')}</CardTitle>
          <CardDescription>{t('sessionsDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div className="flex items-center gap-3">
              <DeviceIcon className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{t('currentSession')}</p>
                  <Badge variant="secondary" className="text-xs">
                    {t('thisDevice')}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{t('lastActivity')}</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button variant="outline" className="text-destructive">
              {t('revokeOthers')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Auth */}
      <TwoFactorSection />
    </PageWrapper>
  );
}

function TwoFactorSection() {
  const t = useTranslations('security');
  const [totpUri, setTotpUri] = React.useState<string | null>(null);
  const [backupCodes, setBackupCodes] = React.useState<string[] | null>(null);
  const [code, setCode] = React.useState('');
  const [is2FAEnabled, setIs2FAEnabled] = React.useState(false);
  const [isEnabling, setIsEnabling] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const handleEnable2FA = async () => {
    setError(null);
    setIsEnabling(true);
    try {
      const { data, error: err } = await authClient.twoFactor.enable({
        password: '', // Better Auth handles this via session
      });
      if (err) throw new Error(err.message || t('errorEnable2FA'));
      if (data?.totpURI) {
        setTotpUri(data.totpURI);
        if (data.backupCodes) {
          setBackupCodes(data.backupCodes);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorEnable2FA'));
    } finally {
      setIsEnabling(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    try {
      const { error: err } = await authClient.twoFactor.verifyTotp({ code });
      if (err) throw new Error(err.message || t('invalidCode'));
      setIs2FAEnabled(true);
      setTotpUri(null);
      setCode('');
      setSuccess(t('twoFactorEnabled'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('invalidCode'));
    }
  };

  const handleDisable2FA = async () => {
    setError(null);
    try {
      const { error: err } = await authClient.twoFactor.disable({
        password: '',
      });
      if (err) throw new Error(err.message || t('errorGeneric'));
      setIs2FAEnabled(false);
      setSuccess(t('twoFactorDisabled'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'));
    }
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldIcon className="h-5 w-5" />
          {t('twoFactor')}
        </CardTitle>
        <CardDescription>{t('twoFactorSubtitle')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</div>
        )}
        {success && (
          <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-500">{success}</div>
        )}

        {is2FAEnabled ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{t('active')}</Badge>
              <p className="text-sm text-muted-foreground">{t('twoFactorProtected')}</p>
            </div>
            <Button variant="outline" className="text-destructive" onClick={handleDisable2FA}>
              {t('disable2FA')}
            </Button>
          </div>
        ) : totpUri ? (
          <div className="max-w-md space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium">{t('scanQR')}</p>
              <div className="inline-block rounded-lg bg-white p-4">
                {/* QR code placeholder — use totpUri to generate */}
                <p className="break-all font-mono text-xs text-black">{totpUri}</p>
              </div>
            </div>

            {backupCodes && (
              <div>
                <p className="mb-2 text-sm font-medium">{t('saveBackupCodes')}</p>
                <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted/50 p-3">
                  {backupCodes.map((bc, i) => (
                    <code key={i} className="font-mono text-xs">
                      {bc}
                    </code>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="totp-code">{t('enterCode')}</Label>
              <div className="flex gap-2">
                <Input
                  id="totp-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="max-w-[200px]"
                />
                <Button onClick={handleVerify} disabled={code.length !== 6}>
                  {t('verify')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('twoFactorTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('twoFactorDescription')}</p>
            </div>
            <Button variant="outline" onClick={handleEnable2FA} disabled={isEnabling}>
              {isEnabling ? t('enabling') : t('enable2FA')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
