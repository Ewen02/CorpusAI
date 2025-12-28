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

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const { error: authError } = await authClient.signIn.email({
        email,
        password,
      });

      if (authError) {
        throw new Error(authError.message || "Erreur de connexion");
      }

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de connexion");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: "google" | "github") => {
    try {
      await authClient.signIn.social({
        provider,
        callbackURL: "http://localhost:3000/dashboard",
      });
    } catch (err) {
      setError("Erreur lors de la connexion avec " + provider);
    }
  };

  return (
    <AuthLayout
      title="Connexion"
      description="Connectez-vous à votre compte CorpusAI"
      showBackLink
      onBack={() => router.push("/")}
      footer={
        <p>
          Pas encore de compte ?{" "}
          <AuthLink href="/sign-up" onClick={() => router.push("/sign-up")}>
            Créer un compte
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
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Mot de passe</Label>
            <AuthLink
              href="/forgot-password"
              onClick={() => router.push("/forgot-password")}
            >
              Mot de passe oublié ?
            </AuthLink>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isLoading}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Connexion..." : "Se connecter"}
        </Button>
      </AuthForm>
    </AuthLayout>
  );
}
