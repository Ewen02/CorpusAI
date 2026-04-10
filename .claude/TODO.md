# CorpusAI — Taches restantes

## Tout ce qui est fait

Sprints 0-4 + V1 Production + V2 Ops + V3 Features + V4 complet (P0-P3) livres.
Voir section "Fait" en bas.

## Reste a faire — Roadmap V5

### P0 — Distribution & Documentation — DONE

- [x] **Documentation API publique** — Page /docs/api, i18n FR/EN, quickstart, endpoints, SDK, webhooks
- [x] **Export corpus** — GET /ais/:aiId/documents/export (ZIP: metadata.json, documents/\*.txt, chunks.jsonl)
- [x] **Design system polish** — Logo atom unifie, AICard unifie (dashboard/explore), glass effects, design tokens standardises, landing alignment

### P1 — Robustesse

- [ ] **APM metriques** — Latency/throughput/error rate temps reel (au-dela du error tracking Sentry)
- [ ] **Unit tests frontend** — Tests Vitest pour hooks et composants web (actuellement E2E uniquement)
- [ ] **Remote caching Turbo** — TURBO_TOKEN + TURBO_TEAM dans CI pour accelerer builds

### P2 — Features Produit

- [ ] **Multi-provider LLM** — Ajouter Claude et Mistral comme providers (pas juste models OpenAI)
- [ ] **Import/export AIs** — Migration config AIs entre comptes, backup

### P3 — Enterprise

- [ ] **SSO Enterprise** — SAML/OIDC pour le plan Enterprise
- [ ] **SDK multi-langage** — Python, Go (en plus de TypeScript)
- [ ] **White-label** — Multi-tenant, custom branding complet

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
- [x] Tests E2E — Playwright installe, specs auth + widget
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

### V3 Fonctionnel (2026-03-28/29)

- [x] Qdrant/RAG refonte — Collection globale, hybrid search (dense 512d + sparse BM25), scalar quantization
- [x] i18n complet — next-intl, FR/EN, ~400 cles, 30+ pages, language switcher
- [x] Onboarding wizard — 7 templates AI pre-configures
- [x] Templates dans /ais/new — Selecteur de templates dans la page de creation
- [x] Slug per-user — @@unique([userId, slug]), URLs /chat/@username/slug
- [x] Multi-langue prompts — EN/FR base prompt + format rules dans ai-rules
- [x] Webhooks API publique — CRUD, HMAC-SHA256 delivery, 4 events, settings UI
- [x] SDK JavaScript — @corpusai/sdk, zero deps, TypeScript, ESM+CJS, query + listAIs

### V4 P0 — Monetisation & Deploy (2026-03-29)

- [x] Stripe billing — Checkout, portail client, webhooks, upgrade/downgrade, 4 plans
- [x] FREE plan limits — 1 AI, 5 docs/AI, 10MB, 20 questions/jour, 10 end-users
- [x] CI/CD pipeline — GitHub Actions: lint, typecheck, test, build, docker matrix

### V4 P1 — Robustesse & Securite (2026-03-29 → 2026-04-10)

- [x] Rate limiting API publique — Redis counters, 60/min, X-RateLimit headers, 429
- [x] Circuit breaker LLM — LLMUnavailableError, callLLMWithRetry, retry transient errors
- [x] i18n error messages — Fallback bilingue, cles next-intl, hooks migres
- [x] PostHog analytics — Production-only, 20+ events types, typed track() helper
- [x] Email package — @corpusai/email, 8 templates production (Resend)

### V4 P2 — Features Produit (2026-03-29/30)

- [x] Analytics ameliore — Top questions, retention, funnel, document chunk usage, periode 24h
- [x] Widget embed.js — Bulle flottante bottom-right, iframe au clic, responsive mobile
- [x] Multi-model LLM — Selecteur GPT-4o-mini/GPT-4o/Mistral par AI, resolveModelConfig()

### V4 P3 — IA Avancee (2026-04-04)

- [x] AI conversation memory — EndUserMemory, LLM summarization, multi-session, memoryEnabled toggle
- [x] Feedback loop — Thumbs up/down, PATCH endpoint, analytics, optimistic UI

### Post-V4 — Hardening (2026-04-10)

- [x] Audit qualite complet — 97/97 checks (frontend, backend, DB, RAG, TS, security, devops, Redis)
- [x] Changesets — @changesets/cli configure, semantic versioning pret
- [x] Typecheck 100% — Experiments exclus du typecheck ai-worker
- [x] Helmet CSP strict — No unsafe-inline, HSTS preload
- [x] Backend audit refactoring — ConfigService injection, ownership centralise

### V5 P0 — Distribution & Documentation (2026-04-10)

- [x] Documentation API publique — Page /docs/api, i18n FR/EN, quickstart, endpoints reference, SDK usage, webhooks verification
- [x] Export corpus ZIP — GET /ais/:aiId/documents/export (archiver), bouton dans settings AI
- [x] Logo atom — Composant @corpusai/ui/Logo unifie (sm/md/lg/xl), remplace 6 implementations dupliquees
- [x] AICard unifie — Fusion AICard + ExploreAICard en un composant avec variants (dashboard/explore)
- [x] Glass effects — bg-page, glass header, orbes flottants sur auth, dashboard, landing, explore, profile
- [x] Design tokens standardises — border-border → border-[hsl(var(--border-default))], bg-muted/\* → bg-[hsl(var(--surface-2))], 21 fichiers
- [x] Landing page alignment — max-w-6xl uniforme header + sections, glass nav
- [x] Boutons CTA sobres — bg-gradient-primary remplace par bg-primary (couleur unie)
