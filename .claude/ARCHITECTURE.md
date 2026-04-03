# CorpusAI — Architecture Technique

## 1. Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│                      apps/web (Next.js 15)                  │
│  Dashboard, Chat, Analytics, Widget embed, API routes       │
└────────────────────┬────────────────────────────────────────┘
                     │ REST + SSE
┌────────────────────▼────────────────────────────────────────┐
│                    apps/api (NestJS 11)                      │
│  auth, users, ais, documents, conversations, rag            │
└────┬─────────────┬─────────────┬─────────────┬──────────────┘
     │             │             │             │
     ▼             ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌──────────┐
│PostgreSQL│  │ Qdrant  │  │  Redis  │  │  OpenAI  │
│ (Neon)   │  │(vectors)│  │(cache + │  │   API    │
└─────────┘  └─────────┘  │ BullMQ +│  └──────────┘
                          │ pub/sub)│
                          └────┬────┘
                               │
                    ┌──────────▼──────────┐
                    │ apps/ai-worker      │
                    │ BullMQ worker       │
                    │ (document processor)│
                    └─────────────────────┘
```

> `apps/ai-worker/` est un worker BullMQ de production (concurrency 3) qui traite les documents de maniere asynchrone : parse → chunk → embed → store dans Qdrant. Il contient aussi des scripts d'experimentation dans `src/experiments/`.

---

## 2. Structure monorepo

```
corpusai/
├── apps/
│   ├── web/              # Next.js 15 — interface createurs + widget
│   ├── api/              # NestJS 11 — backend principal
│   └── ai-worker/        # BullMQ worker — document processing async
├── packages/
│   ├── types/            # Types TypeScript partages (entites, API, enums)
│   ├── subscription/     # Logique abonnements & limites par plan
│   ├── ai-rules/         # Source unique de verite : prompts systeme, confidence
│   ├── database/         # Prisma schema & client PostgreSQL
│   ├── corpus/           # Pipeline RAG complet (parsers → vectors → LLM)
│   ├── queue/            # BullMQ queue client, job types, retry config
│   └── ui/               # Composants React (Atomic Design)
└── tooling/
    └── typescript-config/ # Configs TS partagees
```

---

## 3. Backend (API)

### 3.1 Modules

```
apps/api/src/modules/
├── auth/            # Better Auth (email, OAuth Google/GitHub, sessions)
├── users/           # Profil, stats dashboard, analytics, comptes OAuth
├── ais/             # CRUD AIs, stats par AI
├── documents/       # Upload, retry, delete, progress SSE
├── conversations/   # Chat public + creator, streaming SSE
├── rag/             # Indexation, query, debug, metriques cache
├── end-user-auth/   # Magic link auth (EndUser, cookie eu_session)
├── portal/          # Portail end-user (conversations, profil)
├── public-api/      # API publique v1 (API keys cai_, webhooks)
├── admin/           # Dashboard admin (stats, users, DLQ)
├── eval/            # Évaluation RAG (rapports JSON, métriques)
└── mail/            # Emails transactionnels (Resend)
```

### 3.2 Endpoints

**Auth** (Better Auth)

```
POST   /auth/sign-up/email
POST   /auth/sign-in/email
POST   /auth/sign-out
GET    /auth/session
```

**Users** (authentifie)

```
GET    /users/me
PATCH  /users/me
GET    /users/me/stats
GET    /users/me/accounts
GET    /users/me/analytics?period=7d|30d|90d
```

**AIs** (authentifie)

```
GET    /ais
POST   /ais
GET    /ais/:id
PATCH  /ais/:id
DELETE /ais/:id
GET    /ais/:id/stats
```

**Documents** (authentifie, scope ais/:aiId)

```
GET    /ais/:aiId/documents
POST   /ais/:aiId/documents
POST   /ais/:aiId/documents/text
POST   /ais/:aiId/documents/upload
GET    /ais/:aiId/documents/:id
DELETE /ais/:aiId/documents/:id
POST   /ais/:aiId/documents/:id/retry
GET    /ais/:aiId/documents/:id/progress
SSE    /ais/:aiId/documents/:id/progress/stream    # ownership check + timeout 60s
```

**Conversations** — createur (authentifie)

```
GET    /ais/:aiId/conversations
DELETE /conversations/:id
```

**Conversations** — public (widget / end users)

```
GET    /chat/:aiSlug/info
POST   /chat/:aiSlug/start
GET    /chat/conversations/:id
GET    /chat/conversations/:id/messages
POST   /chat/conversations/:id/messages
POST   /chat/conversations/:id/messages/stream     # SSE + abort on disconnect
```

**RAG** (authentifie)

```
GET    /rag/metrics
GET    /rag/:aiId/debug-query?q=...&threshold=0.6
```

**End-user Auth** (public)

```
POST   /portal/auth/magic-link     # Envoie magic link
GET    /portal/auth/verify         # Valide token → set cookie eu_session
POST   /portal/auth/sign-out       # Clear session
```

**Portal** (EndUserAuthGuard)

```
GET    /portal/me                  # Profil + IAs accessibles
GET    /portal/conversations       # Toutes ses conversations
GET    /portal/conversations/:id   # Messages d'une conversation
```

**Access Control** (AuthGuard createur)

```
POST   /ais/:id/access/token       # Genere lien secret
DELETE /ais/:id/access/token
POST   /ais/:id/access/code        # Definit code d'acces (bcrypt)
DELETE /ais/:id/access/code
PATCH  /ais/:id/access/invite      # { inviteOnly: boolean }
GET    /ais/:id/members            # Liste end-users invites
POST   /ais/:id/members            # Invite par email
DELETE /ais/:id/members/:endUserId # Revoque acces
```

### 3.3 Securite

- **AuthGuard** sur tous les endpoints createur + RAG debug
- **Ownership checks** sur documents, AIs, SSE progress
- **SSRF protection** sur fetch URLs dans les parsers (blocage IP privees, localhost, metadata cloud)
- **Abort streaming** quand le client SSE se deconnecte (economie tokens OpenAI)
- **DTOs + class-validator** pour validation des inputs
- **CORS** configure
- **EndUserAuthGuard** : verifie cookie eu_session (distinct de AuthGuard createur)
- **Access control** : checkAIAccess() verifie accessToken/accessCode/inviteOnly avant toute creation de conversation
- **HMAC-SHA256** sur les webhooks sortants

---

## 4. Frontend (Web)

### 4.1 Routes

```
apps/web/src/app/
├── page.tsx                              # Landing page
├── (auth)/sign-in, sign-up              # Auth pages
├── onboarding/                          # Post-inscription
├── (dashboard)/
│   ├── dashboard/                       # Overview + stats
│   ├── ais/                             # Liste AIs
│   ├── ais/new/                         # Creation AI
│   ├── ais/[id]/                        # Detail AI (tabs: chat, docs, conversations, analytics, debug)
│   ├── ais/[id]/settings/               # Config AI
│   ├── analytics/                       # Dashboard analytics global
│   ├── settings/                        # Profil
│   ├── settings/billing/                # Abonnement (UI only, Stripe TODO)
│   ├── settings/security/               # Securite
│   └── settings/notifications/          # Notifications (placeholder)
├── api/                                 # API routes Next.js
├── embed/[slug]/                        # Widget embeddable (iframe)
├── portal/
│   ├── sign-in/                         # Connexion end-user (magic link)
│   ├── auth/verify/                     # Handler magic link
│   ├── conversations/                   # Liste conversations end-user
│   └── conversations/[id]/              # Detail conversation
├── u/[username]/                        # Profil public createur (OG tags)
└── admin/eval/                          # Dashboard evaluation RAG
```

### 4.2 State management

- **React Query** pour toute la data fetching (cache, invalidation, optimistic updates)
- Hooks custom dans `src/lib/queries/` : use-ai, use-dashboard, use-analytics, use-conversations, use-documents, use-messages
- **API client** : fetch wrapper avec auth automatique (`src/lib/api-client.ts`)

### 4.3 Composants UI (Atomic Design)

**Atoms** : button, input, textarea, label, badge, avatar, skeleton, switch, select, tabs, separator, icons

**Molecules** : card, tooltip, stat-card, trend-badge, chart-tooltip, markdown-renderer

**Organisms** : chat-interface, conversation-list, document-uploader, source-citation

---

## 5. Package @corpusai/corpus

Pipeline RAG complet, production-ready, 127 tests.

```
packages/corpus/src/
├── parsers/         # PDF (pdf-parse), DOCX (mammoth), TXT/MD/CSV/HTML (chardet)
├── chunking/        # RecursiveChunker, MarkdownChunker, TokenChunker (tiktoken)
├── embeddings/      # OpenAI text-embedding-3-small (1536 dims, batch 100)
├── vector-store/    # Qdrant (HNSW, filtering, collection management)
├── cache/           # Redis embedding cache (hits/misses/hitRate)
├── reranking/       # BM25 + HybridReranker (vector + lexical)
└── rag/             # RAGPipelineImpl (index, query, queryStream, delete)
```

### Pipeline RAG

```
Document Processing:
  Upload → Parse (PDF/DOCX/TXT) → Chunk (500-1000 tokens) → Embed (OpenAI) → Store (Qdrant)

Query:
  Question → Embed → Vector Search (Qdrant) → Rerank (BM25 hybrid) → Build Context → LLM (OpenAI) → Stream Response
```

Options cles :

- `debug: boolean` — logging conditionnel (pas de PII en prod)
- `maxContextChars: number` — garde-fou tokens (default 16000)
- `scoreThreshold: number` — seuil de pertinence (default 0.6, overridable a 0.4)
- `conversationHistory` — historique multi-turn passe au LLM (6 derniers messages)

---

## 6. Package @corpusai/ai-rules

Source unique de verite pour le comportement IA.

- `buildSystemPrompt(options?)` — genere le system prompt (FORMAT_RULES + INTERDITS)
- `buildContextSection(chunks, maxChars?)` — formate le contexte RAG avec citations
- `determineConfidence(sources, rules?)` — HIGH/MEDIUM/LOW selon les scores
- `FORMAT_RULES` — regles de comportement (generaliste, citations, ton direct, interdits)
- `DEFAULT_BEHAVIOR_RULES` — thresholds de confiance (0.7 HIGH, 0.5 MEDIUM)

Importe par `@corpusai/corpus` (pipeline) et `apps/api` (conversations.service).

---

## 7. Data model (Prisma)

### Enums

```
SubscriptionPlan    : FREE, CREATOR, PRO, ENTERPRISE
SubscriptionStatus  : ACTIVE, CANCELED, PAST_DUE, TRIALING
AIStatus            : DRAFT, ACTIVE, PAUSED, ARCHIVED
AccessType          : FREE, PAID, INVITE_ONLY, TIME_LIMITED
DocumentStatus      : PENDING, PROCESSING, INDEXED, FAILED
ProcessingStep      : PARSING, CHUNKING, EMBEDDING, STORING
MessageRole         : USER, ASSISTANT
ConfidenceLevel     : HIGH, MEDIUM, LOW
AccessMode          : OPEN, TOKEN, CODE, INVITE
AccessStatus        : ACTIVE, REVOKED, EXPIRED
WebhookEvent        : DOCUMENT_INDEXED, CONVERSATION_STARTED, MESSAGE_SENT, AI_UPDATED
```

### Models principaux

- **User** : email, name, image, subscriptionPlan/Status, stripeCustomerId
- **AI** : slug (unique), name, systemPrompt, welcomeMessage, primaryColor, temperature, maxTokens, scoreThreshold, accessType, price, isPublic, compteurs (documentCount, conversationCount, questionCount)
- **Document** : filename, mimeType, size, status, processingStep, processingProgress (0-100), metadata (pageCount, wordCount, language, title, author)
- **Chunk** : content, position, pageNumber, startChar/endChar, qdrantPointId
- **Conversation** : aiId, endUserId, title, messageCount
- **Message** : role, content, sources (JSON), confidence, tokenUsage, latencyMs
- **EndUser** : email, name, emailVerified, magicLinkToken/Expires, sessionToken/Expires, relations Conversation + AIAccessGrant
- **DailyStats** : userId, aiId, date, documentCount, conversationCount, questionCount
- **AIAccessGrant** : aiId, endUserId, status (ACTIVE/REVOKED/EXPIRED), expiresAt — controle d'acces end-user par invitation
- **Webhook** : url, secret, events[], active — notifications sortantes HMAC-SHA256
- **WebhookDelivery** : webhookId, event, payload, status, attempts

---

## 8. Infra et services externes

| Service           | Usage                                              | Config                     |
| ----------------- | -------------------------------------------------- | -------------------------- |
| PostgreSQL (Neon) | Base de donnees principale                         | DATABASE_URL               |
| Qdrant Cloud      | Stockage vecteurs embeddings                       | QDRANT_URL, QDRANT_API_KEY |
| Redis             | Cache embeddings + BullMQ queue + pub/sub progress | REDIS_URL                  |
| OpenAI            | Embeddings + LLM (chat)                            | OPENAI_API_KEY             |
| Better Auth       | Auth sessions + OAuth                              | BETTER_AUTH_SECRET         |
