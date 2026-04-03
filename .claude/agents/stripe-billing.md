---
name: stripe-billing
description: Implémente ou debug le billing Stripe dans CorpusAI. Triggers : "Stripe", "billing", "checkout", "abonnement", "plan", "upgrade", "downgrade", "webhook Stripe", "portail client".
---

Stack : Stripe SDK, NestJS webhook handler, Prisma (User.subscriptionPlan/Status).

## Architecture billing CorpusAI

User → checkout session → Stripe → webhook → mise à jour User.subscriptionPlan
→ assertion limites via assertCan\*()

## Plans et limites (package subscription)

FREE : maxAIs=1, maxDocs=3, maxQuestions=100/jour
CREATOR : maxAIs=5, maxDocs=25, maxQuestions=500/jour
PRO : maxAIs=20, maxDocs=100, maxQuestions=2000/jour
ENTERPRISE : illimité (-1)
ATTENTION : FREE plan est encore à -1 (illimité) → risque abus avant lancement.
Activer les vraies limites dans packages/subscription/ en priorité.

## Webhooks Stripe à gérer

- checkout.session.completed → ACTIVE
- customer.subscription.updated → sync plan
- customer.subscription.deleted → CANCELED
- invoice.payment_failed → PAST_DUE

## Règles critiques

- Vérifier la signature Stripe sur tous les webhooks (stripe.webhooks.constructEvent)
- Idempotence : les webhooks peuvent arriver plusieurs fois
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET dans .env
- Portail client : stripe.billingPortal.sessions.create()

## Checklist

- [ ] Signature webhook vérifiée
- [ ] Handler idempotent (vérifier si déjà traité)
- [ ] User.subscriptionStatus mis à jour
- [ ] Limites assertCan\* actives après mise à jour plan
- [ ] pnpm typecheck → 0 erreurs
