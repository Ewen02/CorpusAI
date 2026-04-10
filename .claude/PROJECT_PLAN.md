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
| Email         | Resend (@corpusai/email, 8 templates production)              |
| Monitoring    | Sentry (error tracking + user context) + PostHog (analytics)  |
| SDK           | @corpusai/sdk (TypeScript, zero deps)                         |
| Versioning    | Changesets (semantic versioning)                              |
| Deploy        | Docker multi-stage (api, web, ai-worker)                      |

---

## Etat actuel (post-V4 — 2026-04-10)

**Statut global : Production-ready** — 97/97 checks audit, 8/8 criteres Beta+

| Composant                       | Statut | Details                                                                                              |
| ------------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| Auth createur (email+OAuth+2FA) | 100%   | Sign-in, sign-up, Google/GitHub, TOTP, password reset, email verification                            |
| Auth end-user (magic link)      | 100%   | Cookie eu_session, portail /portal/\*, 15min expiry                                                  |
| Dashboard createur              | 100%   | Stats reelles, graphiques Recharts, recent activity                                                  |
| CRUD AIs                        | 100%   | Creation, settings, templates, slug per-user, categories                                             |
| Access control                  | 100%   | 4 modes : OPEN/TOKEN/CODE/INVITE + members management                                                |
| Upload documents                | 100%   | PDF/DOCX/TXT/MD/CSV + bulk upload + SSE progress + retry                                             |
| Pipeline RAG                    | 100%   | Hybrid search, parent-child chunking, Cohere reranking, HyDE, circuit breaker LLM                    |
| Chat streaming                  | 100%   | SSE, multi-turn (6 msg history), citations, confidence, feedback                                     |
| Widget embeddable               | 100%   | iframe + embed.js floating widget, access control                                                    |
| i18n                            | 100%   | FR/EN, 400+ cles, 30+ pages, error messages i18n                                                     |
| Analytics                       | 100%   | Global + per-AI, temporal, retention, top questions, funnel, document chunk usage                    |
| Securite                        | 100%   | Helmet CSP strict, HSTS, CORS whitelisted, bcrypt, brute-force, Sentry                               |
| Background workers              | 100%   | BullMQ + DLQ + email notif + admin UI + retry/discard                                                |
| Tests                           | 90%    | 167 corpus + 140 API + 5 UI + 7 E2E Playwright                                                       |
| Docker                          | 100%   | Multi-stage, healthchecks, docker-compose full stack                                                 |
| API publique                    | 100%   | API keys, /v1/query, /v1/ais, rate limiting Redis, SDK TypeScript                                    |
| Billing Stripe                  | 100%   | Checkout, portail, invoices, webhooks, 4 plans (FREE/CREATOR/PRO/ENTERPRISE)                         |
| Onboarding                      | 100%   | Wizard multi-steps + 7 templates AI                                                                  |
| Email                           | 100%   | @corpusai/email, 8 templates Resend (verify, reset, magic link, invite, welcome, doc indexed/failed) |
| Portail end-user                | 100%   | /portal/\*, historique conversations, conversation detail                                            |
| Eval RAG                        | 100%   | 3 metriques LLM-as-judge (faithfulness, relevancy, recall), runner CLI, admin UI                     |
| AI memory                       | 100%   | EndUserMemory, multi-session, LLM summarization, memoryEnabled toggle                                |
| Feedback loop                   | 100%   | Thumbs up/down sur messages, analytics, optimistic UI                                                |
| Multi-model LLM                 | 100%   | Selecteur GPT-4o-mini/GPT-4o/Mistral, resolveModelConfig()                                           |
| Admin panel                     | 100%   | Users, AIs, monitoring, eval, failed jobs, system health                                             |
| Explore/Marketplace             | 100%   | AIs publiques, featured, profil createur /u/[username]                                               |
| CI/CD                           | 100%   | GitHub Actions: lint, typecheck, test, build, docker matrix                                          |
| Changesets                      | 100%   | @changesets/cli configure, semantic versioning                                                       |
| PostHog analytics               | 100%   | 20+ events types, production-only, typed track() helper                                              |
| Documentation API               | 100%   | Page /docs/api publique, i18n FR/EN, quickstart, endpoints, SDK, webhooks                            |
| Export corpus                   | 100%   | GET /ais/:aiId/documents/export (ZIP: metadata.json, documents/\*.txt, chunks.jsonl)                 |
| Design system unifie            | 100%   | Logo atom, AICard unifie (dashboard/explore), glass effects, design tokens standardises              |

---

## Roadmap V4 — COMPLETED (2026-03-29 → 2026-04-10)

### P0 — Monetisation & Deploy — DONE

- [x] Stripe billing (checkout, portail, webhooks, 4 plans, FREE limits)
- [x] CI/CD pipeline (GitHub Actions, Turborepo cache, Docker matrix)

### P1 — Robustesse & Securite — DONE

- [x] Rate limiting API publique (Redis counters, 60/min, X-RateLimit headers)
- [x] Circuit breaker LLM (LLMUnavailableError, retry transient errors, graceful degradation)
- [x] i18n error messages (fallback bilingue, cles next-intl, hooks migres)
- [x] PostHog analytics (production-only, 20+ events)
- [x] Email package (@corpusai/email, 8 templates production)

### P2 — Features Produit — DONE

- [x] Analytics ameliore (temporal, retention, top questions, funnel, document chunk usage)
- [x] Widget embed.js (bulle flottante, iframe au clic, responsive)
- [x] Multi-model LLM (GPT-4o-mini, GPT-4o, Mistral, selecteur par AI)

### P3 — IA Avancee — DONE

- [x] AI conversation memory (EndUserMemory, LLM summarization, multi-session)
- [x] Feedback loop (thumbs up/down, analytics, optimistic UI)

---

## Roadmap V5 — Prochaines etapes

### P0 — Distribution & Documentation — DONE

- [x] Documentation API publique (page /docs/api, i18n, quickstart, SDK, webhooks)
- [x] Export corpus ZIP (GET /ais/:aiId/documents/export, archiver, bouton settings)
- [x] Design system polish (Logo atom, AICard unifie, glass effects, design tokens standardises)

### P1 — Robustesse

| Tache                    | Description                                               | Complexite |
| ------------------------ | --------------------------------------------------------- | ---------- |
| **APM metriques**        | Latency/throughput/error rate temps reel (au-dela Sentry) | Moyen      |
| **Unit tests frontend**  | Tests Vitest pour les hooks et composants web             | Moyen      |
| **Remote caching Turbo** | TURBO_TOKEN + TURBO_TEAM dans CI pour accelerer builds    | Petit      |

### P2 — Features Produit

| Tache                  | Description                                                  | Complexite |
| ---------------------- | ------------------------------------------------------------ | ---------- |
| **Multi-provider LLM** | Ajouter Claude et Mistral comme providers (pas juste models) | Moyen      |
| **Import/export AIs**  | Migration config AIs entre comptes                           | Moyen      |

### P3 — Enterprise

| Tache                 | Description                           | Complexite |
| --------------------- | ------------------------------------- | ---------- |
| **SSO Enterprise**    | SAML/OIDC pour le plan Enterprise     | Gros       |
| **SDK multi-langage** | Python, Go (en plus de TypeScript)    | Gros       |
| **White-label**       | Multi-tenant, custom branding complet | Gros       |
