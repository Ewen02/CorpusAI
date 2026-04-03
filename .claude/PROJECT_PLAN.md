# CorpusAI — Plan Produit

## Vision

CorpusAI permet à des experts (formateurs, coachs, créateurs de contenu) de **transformer leur savoir documentaire en une IA conversationnelle** qu'ils peuvent intégrer sur leur site ou partager via un lien.

L'IA est **généraliste avec accès documentaire** : elle répond en priorité à partir du corpus indexé (avec citations de sources), mais utilise ses connaissances générales quand la question sort du périmètre des documents.

---

## Modèle de domaine

```
User (1) ──── (N) AI (1) ──── (N) Document (1) ──── (N) Chunk
                    │
                    ├── (N) Conversation (1) ──── (N) Message
                    │
                    ├── (N) DailyStats
                    │
                    └── (N) Webhook ──── (N) WebhookDelivery

EndUser (1) ──── (N) Conversation
```

| Entite          | Description                                                                |
| --------------- | -------------------------------------------------------------------------- |
| User            | Createur qui possede des AIs (auth email + OAuth)                          |
| AI              | Assistant IA avec son corpus, sa config et ses stats                       |
| Document        | Fichier source (PDF, DOCX, TXT, MD) indexe en chunks                       |
| Chunk           | Fragment de document avec reference vers le vecteur Qdrant                 |
| Conversation    | Session de chat entre un EndUser et une AI                                 |
| Message         | Message avec role, sources JSON, confidence, metriques                     |
| EndUser         | Utilisateur final du widget (identifie par sessionId)                      |
| DailyStats      | Metriques agregees par jour (documents, conversations, questions)          |
| Webhook         | Subscription evenementielle (document.indexed, conversation.started, etc.) |
| WebhookDelivery | Log de chaque livraison webhook (status, tentatives)                       |

---

## Stack technique

| Composant     | Technologie                                                   |
| ------------- | ------------------------------------------------------------- |
| Frontend      | Next.js 15, React 19, Tailwind, shadcn/ui, next-intl (FR/EN)  |
| Backend       | NestJS 11, Prisma 6, PostgreSQL (Neon)                        |
| Vector DB     | Qdrant Cloud (collection globale, hybrid search dense+sparse) |
| Cache + Queue | Redis (cache embeddings + BullMQ + pub/sub + DLQ)             |
| Embeddings    | OpenAI text-embedding-3-small (512d Matryoshka)               |
| LLM           | OpenAI GPT-4o-mini / GPT-4o                                   |
| Auth          | Better Auth (email + OAuth Google/GitHub)                     |
| Monitoring    | Sentry (error tracking + user context)                        |
| SDK           | @corpusai/sdk (TypeScript, zero deps)                         |
| Deploy        | Docker multi-stage (api, web, ai-worker)                      |

---

## Etat actuel (post-V3)

| Composant                       | Statut | Details                                                                 |
| ------------------------------- | ------ | ----------------------------------------------------------------------- |
| Auth createur (email+OAuth+2FA) | 100%   | Sign-in, sign-up, Google/GitHub, TOTP                                   |
| Auth end-user (magic link)      | 100%   | Cookie eu_session, portail /portal/\*                                   |
| Dashboard createur              | 100%   | Stats reelles, graphiques Recharts                                      |
| CRUD AIs                        | 100%   | Creation, settings, templates, slug per-user                            |
| Access control                  | 100%   | 4 modes : OPEN/TOKEN/CODE/INVITE                                        |
| Upload documents                | 100%   | PDF/DOCX/TXT/MD/CSV + bulk upload + SSE                                 |
| Pipeline RAG                    | 100%   | Hybrid search dense+sparse, 512d Matryoshka, parent-child, Cohere, HyDE |
| Chat streaming                  | 100%   | SSE, multi-turn, citations, confidence                                  |
| Widget embeddable               | 100%   | /embed/@username/slug, access control                                   |
| i18n                            | 100%   | FR/EN, 400+ cles, 30+ pages                                             |
| Analytics                       | 100%   | Dashboard global + par AI                                               |
| Securite                        | 100%   | SSRF, AuthGuard, ownership, Sentry                                      |
| Background workers              | 100%   | BullMQ + DLQ + email notif + admin UI                                   |
| Tests                           | 90%    | 167 corpus + 140 API + 50 frontend + 24 E2E                             |
| Docker                          | 100%   | Multi-stage, healthchecks, migrations                                   |
| API publique                    | 100%   | API keys, /v1/query, /v1/ais, webhooks, SDK                             |
| Onboarding                      | 100%   | Wizard + 7 templates AI                                                 |
| Email                           | 100%   | Resend, 5 templates, magic link, invitations                            |
| Portail end-user                | 100%   | /portal/\*, historique conversations                                    |
| Eval RAG                        | 100%   | Script RAGAS TS, page admin /admin/eval                                 |
| Design system                   | 100%   | Palette Violet/Cobalt, glass utilities, shadcn                          |
| Profils publics                 | 100%   | /u/[username], OG tags                                                  |
| Billing Stripe                  | 100%   | Checkout, portail, invoices, webhooks, 4 plans                          |

---

## Roadmap V4

### P0 — Monetisation & Deploy

| Tache                          | Description                                                     | Complexite |
| ------------------------------ | --------------------------------------------------------------- | ---------- |
| **Stripe billing fonctionnel** | Checkout, portail client, webhooks Stripe, upgrade/downgrade    | Moyen      |
| **CI/CD pipeline**             | GitHub Actions (build, test, lint, deploy) avec cache Turborepo | Petit      |

### P1 — Robustesse & Securite

| Tache                          | Description                                            | Complexite |
| ------------------------------ | ------------------------------------------------------ | ---------- |
| **Rate limiting API publique** | Throttle par API key, headers X-RateLimit              | Petit      |
| **Monitoring APM**             | Metriques temps reel (latence, throughput, error rate) | Moyen      |
| **Export corpus**              | Export ZIP (documents + chunks) pour backup/migration  | Petit      |

### P2 — Features Produit

| Tache                            | Description                                            | Complexite |
| -------------------------------- | ------------------------------------------------------ | ---------- |
| **Dashboard analytics ameliore** | Graphiques temporels, retention, top questions, funnel | Moyen      |
| **Widget JS embeddable**         | Script embed.js (plus simple que iframe), auto-init    | Moyen      |
| **Multi-model support**          | Choix du LLM par AI (Claude, Mistral, GPT-4o)          | Moyen      |

### P3 — IA Avancee

| Tache                           | Description                                               | Complexite |
| ------------------------------- | --------------------------------------------------------- | ---------- |
| **AI conversation memory**      | Multi-session, l'AI se souvient des conversations passees | Gros       |
| **Fine-tuning / feedback loop** | Thumbs up/down, ameliorer les reponses avec le feedback   | Gros       |
