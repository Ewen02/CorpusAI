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
| Cache + Queue | Redis (cache embeddings + BullMQ + pub/sub) |
| Embeddings | OpenAI text-embedding-3-small (1536 dims) |
| LLM | OpenAI GPT-4o-mini / GPT-4o |
| Auth | Better Auth (email + OAuth Google/GitHub) |

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
| Background workers | 90% | BullMQ + Redis + @corpusai/queue + ai-worker production (manque dead-letter queue polish) |
| Tests | 20% | Seulement @corpusai/corpus (127 tests) |

---

## Roadmap

### P0 — Requis pour lancement

| Tache | Description |
|-------|-------------|
| ~~**Background workers**~~ | ~~Implemente : BullMQ + Redis + @corpusai/queue + ai-worker~~ |
| **Sentry integration** | Error tracking + alerting production |

### P1 — Important

| Tache | Description |
|-------|-------------|
| **Tests API** | Augmenter couverture (admin, public-api non testes) |
| **Tests E2E** | Etoffer les specs Playwright (sign-up > create AI > upload > chat) |
| **Tests frontend** | Ajouter ChatInterface, hooks (seuls 2 composants testes) |

### P2 — Qualite

| Tache | Description |
|-------|-------------|
| **Dead-letter queue** | Alerting sur jobs echoues apres 3 retries |
| **APM / monitoring** | Metriques temps reel (latence, throughput) |
| **Docker production** | Build multi-stage optimise pour deploy |

### P3 — Nice to have

| Tache | Description |
|-------|-------------|
| **Onboarding ameliore** | Wizard guide, templates AI pre-configures |
| **Multi-langue prompts** | Support EN dans ai-rules (actuellement FR uniquement) |
| **Webhooks API publique** | Notifications evenementielles pour integrateurs |
| **SDK JavaScript** | Client npm pour l'API publique |
| **Import/export bulk** | Import ZIP multi-documents, export corpus |
