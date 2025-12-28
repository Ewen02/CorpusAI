"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  AuthLayout,
  AuthForm,
  AuthDivider,
  AuthLink,
  SocialButton,
  Button,
  Input,
  Label,
} from "@corpusai/ui";
import { authClient } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères");
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
        throw new Error(authError.message || "Erreur lors de l'inscription");
      }

      router.push("/onboarding");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erreur lors de l'inscription"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "github") => {
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: "http://localhost:3000/onboarding",
      });
    } catch (err) {
      setError("Erreur lors de la connexion avec " + provider);
    }
  };

  return (
    <AuthLayout
      title="Créer un compte"
      description="Commencez à créer vos assistants IA"
      showBackLink
      onBack={() => router.push("/")}
      footer={
        <p>
          Déjà un compte ?{" "}
          <AuthLink href="/sign-in" onClick={() => router.push("/sign-in")}>
            Se connecter
          </AuthLink>
        </p>
      }
    >
      <div className="space-y-4">
        <SocialButton
          provider="google"
          onClick={() => handleSocialAuth("google")}
        />
        <SocialButton
          provider="github"
          onClick={() => handleSocialAuth("github")}
        />
      </div>

      <AuthDivider />

      <AuthForm onSubmit={handleSubmit}>
        {error && (
          <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name">Nom</Label>
          <Input
            id="name"
            type="text"
            placeholder="Jean Dupont"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

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

        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground">Minimum 8 caractères</p>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Création..." : "Créer mon compte"}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          En créant un compte, vous acceptez nos{" "}
          <AuthLink href="/terms" onClick={() => router.push("/terms")}>
            Conditions d&apos;utilisation
          </AuthLink>{" "}
          et notre{" "}
          <AuthLink href="/privacy" onClick={() => router.push("/privacy")}>
            Politique de confidentialité
          </AuthLink>
        </p>
      </AuthForm>
    </AuthLayout>
  );
}
