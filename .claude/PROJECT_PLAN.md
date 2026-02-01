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
                    └── (N) DailyStats

EndUser (1) ──── (N) Conversation
```

| Entite | Description |
|--------|-------------|
| User | Createur qui possede des AIs (auth email + OAuth) |
| AI | Assistant IA avec son corpus, sa config et ses stats |
| Document | Fichier source (PDF, DOCX, TXT, MD, CSV, HTML) indexe en chunks |
| Chunk | Fragment de document avec reference vers le vecteur Qdrant |
| Conversation | Session de chat entre un EndUser et une AI |
| Message | Message avec role, sources JSON, confidence, metriques |
| EndUser | Utilisateur final du widget (identifie par sessionId) |
| DailyStats | Metriques agregees par jour (documents, conversations, questions) |

---

## Stack technique

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 15, React 19, Tailwind, shadcn/ui |
| Backend | NestJS 11, Prisma 6, PostgreSQL (Neon) |
| Vector DB | Qdrant Cloud |
| Cache | Redis (cache embeddings) |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| LLM | OpenAI GPT-4o-mini / GPT-4o |
| Auth | Better Auth (email + OAuth Google/GitHub) |
| Paiements | Stripe (hors scope actuel) |

---

## Etat actuel

| Composant | Statut | Details |
|-----------|--------|---------|
| Auth (email + OAuth) | 100% | Sign-in, sign-up, sessions, Google/GitHub |
| Dashboard createur | 100% | Stats reelles, graphiques, tendances |
| CRUD AIs | 100% | Creation, edition, suppression, settings |
| Upload documents | 100% | PDF, DOCX, TXT, MD, CSV, HTML + progress SSE |
| Pipeline RAG | 100% | Parse > Chunk > Embed > Store > Query > Stream |
| Chat streaming | 100% | SSE, historique conversation, citations sources |
| Widget embeddable | 100% | /embed/[slug] avec params (theme, color, height) |
| Analytics | 90% | Dashboard global + par AI, graphiques Recharts |
| Securite | 90% | SSRF, AuthGuard, ownership checks, abort streaming |
| Background workers | 0% | Document processing synchrone dans l'API |
| Rate limiting | 50% | Logique dans @corpusai/subscription, pas enforced |
| Tests | 20% | Seulement @corpusai/corpus (127 tests) |

---

## Roadmap

### P0 — Requis pour lancement

| Tache | Description |
|-------|-------------|
| **Background workers** | BullMQ + Redis pour processing documents async (actuellement synchrone dans l'API) |
| **Rate limiting** | Enforcement dans l'API (par endpoint, par plan, compteur questions/jour) |

### P1 — Important

| Tache | Description |
|-------|-------------|
| **Tests API** | Tests d'integration NestJS (endpoints, guards, services) |
| **Structured logging** | Remplacer console.log residuel par Pino/Winston, integrer Sentry |

### P2 — Qualite

| Tache | Description |
|-------|-------------|
| **Tests E2E** | Playwright pour les flows critiques (sign-up > create AI > upload > chat) |
| **Tests frontend** | Vitest + Testing Library pour composants et hooks |
| **ESLint partage** | Config commune dans tooling/eslint-config |
| **CI/CD** | GitHub Actions : lint, typecheck, test, build, deploy preview |

### P3 — Nice to have

| Tache | Description |
|-------|-------------|
| **Admin panel** | Routes admin, gestion users, monitoring usage |
| **Onboarding ameliore** | Wizard guide, templates AI pre-configures |
| **API publique** | Endpoints documentes pour integration tierce |
| **Multi-langue prompts** | Support EN dans ai-rules (actuellement FR uniquement) |
