# CorpusAI — Taches restantes

## P0 — Requis pour lancement

- [ ] **Background workers**
  - Setup BullMQ + Redis dans apps/ai-worker
  - Job queue pour document processing (actuellement synchrone dans l'API)
  - Worker: parse > chunk > embed > store
  - Retry/dead-letter pour les jobs echoues

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

---

## Fait recemment (reference)

- Refactoring ai-rules comme source unique de verite (prompts, confidence)
- Securite : SSRF protection, AuthGuard RAG, ownership SSE, abort streaming
- Debug logging conditionnel, maxContextChars, scoreThreshold unifie
- Conversation history multi-turn, DRY getConversationHistory()
- Tests pipeline alignes avec implementation (127 tests passing)
