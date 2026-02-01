"use client";

import * as React from "react";
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
} from "@corpusai/ui";
import { authClient } from "@/lib/auth-client";
import { apiClient } from "@/lib/api-client";
import { useFormState } from "@/lib/hooks";
import { getProviderInfo } from "@/lib/constants";
import { DeviceIcon } from "@/lib/icons";
import { PageWrapper } from "@/components/page-wrapper";

interface AccountInfo {
  providerId: string;
  createdAt: string;
}

export default function SettingsSecurityPage() {
  const { data: session } = authClient.useSession();
  const [accounts, setAccounts] = React.useState<AccountInfo[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");

  const formState = useFormState();

  React.useEffect(() => {
    const fetchAccounts = async () => {
      try {
        const data = await apiClient.get<AccountInfo[]>("/users/me/accounts");
        setAccounts(data);
      } catch (err) {
        console.error("Error fetching accounts:", err);
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
  const hasPasswordAuth = accounts.some((a) => a.providerId === "credential");
  const oauthAccounts = accounts.filter((a) => a.providerId !== "credential");

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    formState.clearMessages();

    if (newPassword !== confirmPassword) {
      formState.setError("Les mots de passe ne correspondent pas");
      return;
    }

    if (newPassword.length < 8) {
      formState.setError("Le mot de passe doit contenir au moins 8 caractères");
      return;
    }

    formState.setLoading(true);

    try {
      // TODO: Implement password change via Better Auth
      await new Promise((resolve) => setTimeout(resolve, 1000));
      formState.setSuccess("Mot de passe modifié avec succès");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      formState.setError("Erreur lors du changement de mot de passe");
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
          <CardTitle>Méthode de connexion</CardTitle>
          <CardDescription>
            Comment vous vous connectez à votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accounts.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune méthode de connexion configurée.
            </p>
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
                          Connecté le{" "}
                          {new Date(account.createdAt).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="secondary">Actif</Badge>
                  </div>
                </React.Fragment>
              );
            })
          )}

          {oauthAccounts.length > 0 && !hasPasswordAuth && (
            <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p>
                Vous êtes connecté via {oauthAccounts.map((a) => getProviderInfo(a.providerId).name).join(", ")}.
                La gestion du mot de passe n&apos;est pas disponible pour les comptes OAuth.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Change - Only show if user has password auth */}
      {hasPasswordAuth && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Mot de passe</CardTitle>
            <CardDescription>
              Modifiez votre mot de passe pour sécuriser votre compte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Mot de passe actuel</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum 8 caractères
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              {formState.error && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {formState.error}
                </div>
              )}
              {formState.success && (
                <div className="p-3 rounded-lg bg-green-500/10 text-green-500 text-sm">
                  {formState.success}
                </div>
              )}

              <Button type="submit" disabled={formState.isLoading}>
                {formState.isLoading ? "Modification..." : "Modifier le mot de passe"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Sessions */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Sessions actives</CardTitle>
          <CardDescription>
            Gérez les appareils connectés à votre compte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              <DeviceIcon className="h-8 w-8 text-muted-foreground" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Session actuelle</p>
                  <Badge variant="secondary" className="text-xs">
                    Cet appareil
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Dernière activité : maintenant
                </p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button variant="outline" className="text-destructive">
              Déconnecter toutes les autres sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Two-Factor Auth */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Authentification à deux facteurs</CardTitle>
          <CardDescription>
            Ajoutez une couche de sécurité supplémentaire.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Authentification 2FA</p>
              <p className="text-sm text-muted-foreground">
                Protégez votre compte avec une vérification supplémentaire.
              </p>
            </div>
            <Button variant="outline" disabled>
              Bientôt disponible
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
