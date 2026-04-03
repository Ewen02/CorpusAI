# CorpusAI — Taches restantes

## Tout ce qui est fait

Sprints 0-4 + V1 Production + V2 Ops + V3 Features livres. Voir section "Fait" en bas.

## Reste a faire — Roadmap V4

### P0 — Monetisation & Deploy (priorite absolue)

- [ ] **Stripe billing fonctionnel** — Checkout, portail client, webhooks, upgrade/downgrade. CRITIQUE : plan FREE = -1 (illimite) sur tout. Risque abus OpenAI/Qdrant avant ouverture publique.
- [ ] **CI/CD pipeline** — GitHub Actions (build, test, lint, deploy) avec cache Turborepo

### P1 — Robustesse & Securite

- [ ] **Rate limiting API publique** — Throttle par API key, headers X-RateLimit
- [ ] **Monitoring APM** — Metriques latence, throughput, error rate
- [ ] **Export corpus** — ZIP documents + chunks pour backup/migration

### P2 — Features Produit

- [ ] **Dashboard analytics ameliore** — Graphiques temporels, retention, top questions, funnel
- [ ] **Widget JS embeddable** — embed.js script (plus simple que iframe)
- [ ] **Multi-model support** — Choix du LLM par AI (Claude, Mistral, GPT-4o)

### P3 — IA Avancee (apres utilisateurs actifs)

- [ ] **AI conversation memory** — Multi-session, memoire des conversations passees
- [ ] **Fine-tuning / feedback loop** — Thumbs up/down, ameliorer les reponses

---

## Fait (reference)

### Sprint 0 — P0 Core

- [x] Background workers — BullMQ + Redis + @corpusai/queue + ai-worker (concurrency 3, retry 3x)
- [x] Refactoring ai-rules comme source unique de verite (prompts, confidence)
- [x] Securite : SSRF protection, AuthGuard RAG, ownership SSE, abort streaming
- [x] Debug logging conditionnel, maxContextChars, scoreThreshold unifie
- [x] Conversation history multi-turn, DRY getConversationHistory()
- [x] Tests pipeline alignes avec implementation (127 tests passing)
- [x] Widget embeddable /embed/[slug] avec params (theme, color, height)
- [x] Dashboard createur avec stats reelles + graphiques Recharts
- [x] Chat streaming SSE complet avec citations sources et niveaux confiance

### Sprint 1 — P0 Auth & Security

- [x] Forgot/reset password — pages avec Better Auth
- [x] Changement mot de passe — settings/security

### Sprint 2 — P1 Robustesse

- [x] Structured logging Pino — API (nestjs-pino) + ai-worker (pino instance)
- [x] Tests API — 71 tests Vitest (services, guards, ownership)
- [x] Analytics verification — incrementDailyStats sur tous les paths

### Sprint 3 — P2 Qualite & DX

- [x] ESLint config partagee — tooling/eslint-config (base, next, nestjs, library)
- [x] Tests frontend — Vitest + Testing Library (web + ui)
- [x] Tests E2E — Playwright installe, specs auth + widget (stubs)
- [x] CI/CD — Jobs paralleles, cache Turborepo, coverage

### Sprint 4 — P3 Features

- [x] Admin panel — Dashboard, gestion users/AIs, AdminGuard
- [x] UX — 2FA (TOTP), suppression compte, onboarding banner
- [x] API publique — API keys (cai\_ prefix), endpoints /v1/query et /v1/ais

### V1 Production (2026-03-27)

- [x] Tests API complets — 140 tests (6 modules ajoutes + fixes pre-existants)
- [x] Sentry monitoring — Release tracking, setUser dans guards, aiId tagging
- [x] Admin monitoring — Deep health check (Postgres, Qdrant, Redis, OpenAI), test runner
- [x] Profils publics — Username/bio dans settings, /u/[username] avec OG/Twitter tags
- [x] Email templates — 5 templates extraits, layout primitives reutilisables
- [x] Bulk upload — POST /upload-bulk, frontend batch FormData

### V2 Ops & Qualite (2026-03-28)

- [x] Docker production — Multi-stage builds, pnpm deploy, healthchecks, Prisma migrations
- [x] Dead-letter queue — Email notif auto, admin failed-jobs UI, retry/discard via BullMQ
- [x] Tests E2E Playwright — 24 scenarios reels, fixtures auth, 5 fichiers spec
- [x] Tests frontend Vitest — ChatInterface, DocumentUploader, Table, StatCard, usePublicChat (50 tests)

### V3 Fonctionnel P3 (2026-03-28/29)

- [x] Qdrant/RAG refonte — Collection globale, hybrid search (dense 512d + sparse BM25), scalar quantization
- [x] i18n complet — next-intl, FR/EN, ~400 cles, 30+ pages, language switcher
- [x] Onboarding wizard — 7 templates AI pre-configures (Support, Education, Legal, Finance, Health, Tech, Custom)
- [x] Templates dans /ais/new — Selecteur de templates dans la page de creation
- [x] Slug per-user — @@unique([userId, slug]), URLs /chat/@username/slug
- [x] Multi-langue prompts — EN/FR base prompt + format rules dans ai-rules
- [x] Webhooks API publique — CRUD, HMAC-SHA256 delivery, 4 events, settings UI
- [x] SDK JavaScript — @corpusai/sdk, zero deps, TypeScript, ESM+CJS, query + listAIs
