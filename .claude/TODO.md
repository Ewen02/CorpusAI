# CorpusAI — Taches restantes

## Tout ce qui est fait

Sprints 0-4 livres. Voir section "Fait" en bas pour le detail complet.

## Reste a faire

### Fonctionnel
- [ ] **Multi-langue prompts** — Support EN dans ai-rules (actuellement FR uniquement)
- [ ] **Onboarding wizard** — Templates AI pre-configures, guide pas-a-pas
- [ ] **Webhooks API publique** — Notifications evenementielles pour integrateurs
- [ ] **SDK JavaScript** — Client npm pour l'API publique
- [ ] **Import/export bulk** — Import ZIP multi-documents, export corpus

### Qualite / Ops
- [ ] **Sentry integration** — Error tracking + alerting production
- [ ] **APM / monitoring** — Metriques temps reel (latence, throughput)
- [ ] **Dead-letter queue polish** — Alerting sur jobs echoues apres 3 retries
- [ ] **Docker production images** — Build multi-stage optimise pour deploy

### Tests a renforcer
- [ ] **Augmenter couverture API** — Modules admin, public-api non testes
- [ ] **Tests E2E complets** — Les specs Playwright sont des stubs, a etoffer avec vraies assertions
- [ ] **Tests frontend** — Seuls 2 composants testes (ConversationList, utils), ajouter ChatInterface, hooks

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
- [x] API publique — API keys (cai_ prefix), endpoints /v1/query et /v1/ais
