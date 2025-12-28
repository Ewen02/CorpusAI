"use client";

import * as React from "react";
import {
  Button,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Skeleton,
  Separator,
} from "@corpusai/ui";
import { authClient } from "@/lib/auth-client";

interface PlanFeature {
  name: string;
  included: boolean;
  limit?: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  period: string;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: "FREE",
    name: "Gratuit",
    price: 0,
    period: "mois",
    description: "Pour découvrir CorpusAI",
    features: [
      { name: "1 assistant IA", included: true },
      { name: "10 documents", included: true, limit: "max" },
      { name: "100 questions/mois", included: true },
      { name: "Support communautaire", included: true },
      { name: "API access", included: false },
      { name: "Widget personnalisé", included: false },
    ],
  },
  {
    id: "PRO",
    name: "Pro",
    price: 29,
    period: "mois",
    description: "Pour les créateurs de contenu",
    popular: true,
    features: [
      { name: "5 assistants IA", included: true },
      { name: "100 documents", included: true, limit: "max" },
      { name: "Questions illimitées", included: true },
      { name: "Support prioritaire", included: true },
      { name: "API access", included: true },
      { name: "Widget personnalisé", included: true },
    ],
  },
  {
    id: "BUSINESS",
    name: "Business",
    price: 99,
    period: "mois",
    description: "Pour les équipes",
    features: [
      { name: "Assistants illimités", included: true },
      { name: "Documents illimités", included: true },
      { name: "Questions illimitées", included: true },
      { name: "Support dédié", included: true },
      { name: "API access avancé", included: true },
      { name: "SSO & Analytics", included: true },
    ],
  },
];

export default function SettingsBillingPage() {
  const { data: session } = authClient.useSession();
  const [currentPlan, setCurrentPlan] = React.useState<string>("FREE");
  const [isLoading, setIsLoading] = React.useState(true);
  const [stats, setStats] = React.useState<{
    aiCount: number;
    documentCount: number;
    questionCount: number;
  } | null>(null);

  // Fetch user stats
  React.useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("http://localhost:3001/users/me/stats", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data);
          setCurrentPlan(data.subscriptionPlan || "FREE");
        }
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      fetchStats();
    }
  }, [session]);

  const handleUpgrade = (planId: string) => {
    // TODO: Implement Stripe checkout
    console.log("Upgrade to:", planId);
    alert(`L'intégration Stripe sera ajoutée prochainement pour passer au plan ${planId}`);
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
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentPlanData = plans.find((p) => p.id === currentPlan) ?? plans[0]!;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle>Votre abonnement</CardTitle>
          <CardDescription>
            Gérez votre plan et votre facturation.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold">{currentPlanData.name}</h3>
                {currentPlan !== "FREE" && (
                  <Badge variant="secondary">Actif</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {currentPlanData.description}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">
                {currentPlanData.price}€
                <span className="text-sm font-normal text-muted-foreground">
                  /{currentPlanData.period}
                </span>
              </p>
            </div>
          </div>

          {/* Usage Stats */}
          <div>
            <h4 className="text-sm font-medium mb-3">Utilisation actuelle</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold">{stats?.aiCount || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Assistant(s) IA
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold">{stats?.documentCount || 0}</p>
                <p className="text-xs text-muted-foreground">Documents</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/30">
                <p className="text-2xl font-bold">{stats?.questionCount || 0}</p>
                <p className="text-xs text-muted-foreground">
                  Questions ce mois
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plans */}
      <Card>
        <CardHeader>
          <CardTitle>Changer de plan</CardTitle>
          <CardDescription>
            Choisissez le plan adapté à vos besoins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => {
              const isCurrent = plan.id === currentPlan;
              return (
                <div
                  key={plan.id}
                  className={`relative p-6 rounded-lg border ${
                    plan.popular
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  } ${isCurrent ? "ring-2 ring-primary" : ""}`}
                >
                  {plan.popular && (
                    <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">
                      Populaire
                    </Badge>
                  )}
                  {isCurrent && (
                    <Badge
                      variant="secondary"
                      className="absolute -top-2 right-4"
                    >
                      Actuel
                    </Badge>
                  )}

                  <div className="text-center mb-4">
                    <h3 className="text-lg font-semibold">{plan.name}</h3>
                    <p className="text-3xl font-bold mt-2">
                      {plan.price}€
                      <span className="text-sm font-normal text-muted-foreground">
                        /{plan.period}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.description}
                    </p>
                  </div>

                  <Separator className="my-4" />

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        {feature.included ? (
                          <CheckIcon className="h-4 w-4 text-green-500" />
                        ) : (
                          <XIcon className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span
                          className={
                            feature.included ? "" : "text-muted-foreground"
                          }
                        >
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    className="w-full"
                    variant={isCurrent ? "outline" : plan.popular ? "default" : "secondary"}
                    disabled={isCurrent}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isCurrent ? "Plan actuel" : "Choisir ce plan"}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Historique de facturation</CardTitle>
          <CardDescription>
            Vos factures et paiements précédents.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <ReceiptIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune facture disponible</p>
            <p className="text-sm">
              Vos factures apparaîtront ici après votre premier paiement.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Icons
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function ReceiptIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
      <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
      <path d="M12 17.5v-11" />
    </svg>
  );
}
