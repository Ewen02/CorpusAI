"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@corpusai/ui";
import { authClient } from "@/lib/auth-client";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  // Redirect to sign-in if not authenticated
  React.useEffect(() => {
    if (!isPending && !session) {
      router.push("/sign-in");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  const firstName = session?.user?.name?.split(" ")[0] || "there";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-8 text-center">
        {/* Welcome Icon */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-10 w-10 text-primary"
          >
            <path d="M12 8V4H8" />
            <rect width="16" height="12" x="4" y="8" rx="2" />
            <path d="M2 14h2" />
            <path d="M20 14h2" />
            <path d="M15 13v2" />
            <path d="M9 13v2" />
          </svg>
        </div>

        {/* Welcome Message */}
        <div className="space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">
            Bienvenue, {firstName} !
          </h1>
          <p className="text-lg text-muted-foreground">
            Vous etes pret a transformer vos documents en assistants IA intelligents.
          </p>
        </div>

        {/* Features Preview */}
        <div className="grid gap-4 pt-4 text-left">
          <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-primary"
              >
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Importez vos documents</h3>
              <p className="text-sm text-muted-foreground">
                PDF, Word, texte... Tous vos fichiers deviennent une base de connaissances.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-primary"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Posez des questions</h3>
              <p className="text-sm text-muted-foreground">
                Votre IA repond instantanement en se basant sur vos documents.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5 text-primary"
              >
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                <polyline points="16 6 12 2 8 6" />
                <line x1="12" x2="12" y1="2" y2="15" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold">Partagez avec le monde</h3>
              <p className="text-sm text-muted-foreground">
                Integrez votre assistant sur votre site ou partagez-le publiquement.
              </p>
            </div>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col gap-3 pt-4">
          <Button
            size="lg"
            className="w-full"
            onClick={() => router.push("/ais/new")}
          >
            Creer mon premier assistant
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push("/dashboard")}
          >
            Explorer le dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
