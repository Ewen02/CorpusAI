# CorpusAI — Taches restantes

## P0 — Requis pour lancement

- [ ] **Rate limiting**
  - Guard NestJS par endpoint et par plan
  - Compteur questions/jour par AI (utiliser @corpusai/subscription)
  - Reponse 429 avec headers Retry-After
  - Indicateur cote frontend

## P1 — Important

- [ ] **Tests API**
  - Tests d'integration NestJS (supertest)
  - Couverture : auth guards, ownership checks, CRUD, RAG query
  - Mock Prisma + Qdrant pour isolation

- [ ] **Structured logging**
  - Remplacer console.log residuels par Pino ou Winston
  - Integrer Sentry pour error tracking
  - Correlation IDs pour tracer les requetes

## P2 — Qualite

- [ ] **Tests E2E** — Playwright pour flows critiques
- [ ] **Tests frontend** — Vitest + Testing Library
- [ ] **ESLint config partagee** — tooling/eslint-config
- [ ] **CI/CD** — GitHub Actions (lint, typecheck, test, build, deploy preview)

## P3 — Nice to have

- [ ] Admin panel (routes, gestion users, monitoring)
- [ ] Onboarding ameliore (wizard guide, templates AI)
- [ ] API publique documentee
- [ ] Multi-langue prompts dans ai-rules (EN)
- [ ] Integration Stripe (checkout, webhooks, gestion abonnements)
- [ ] Analytics reelles (ecrire dans DailyStats a chaque interaction)
- [ ] Forgot password page
- [ ] Changement mot de passe fonctionnel (settings/security)

---

## Fait (reference)

- [x] **Background workers** — BullMQ + Redis + @corpusai/queue package + ai-worker production worker (concurrency 3, retry 3x, exponential backoff)
- [x] Refactoring ai-rules comme source unique de verite (prompts, confidence)
- [x] Securite : SSRF protection, AuthGuard RAG, ownership SSE, abort streaming
- [x] Debug logging conditionnel, maxContextChars, scoreThreshold unifie
- [x] Conversation history multi-turn, DRY getConversationHistory()
- [x] Tests pipeline alignes avec implementation (127 tests passing)
- [x] Widget embeddable /embed/[slug] avec params (theme, color, height)
- [x] Dashboard createur avec stats reelles + graphiques Recharts
- [x] Chat streaming SSE complet avec citations sources et niveaux confiance
- [x] Setup Claude Code optimal (CLAUDE.md split, slash commands, settings.json)
