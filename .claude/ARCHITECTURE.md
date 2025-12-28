# CorpusAI - Architecture Complète

## Document d'Architecture Frontend & Backend

---

# 1. VUE D'ENSEMBLE

## 1.1 Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| **Frontend** | Next.js + React | 15.x + 19.x |
| **Backend** | NestJS | 11.x |
| **Database** | PostgreSQL + Prisma | 17.x + 6.x |
| **Vector DB** | Qdrant | 1.12.x |
| **Auth** | Better Auth | - |
| **AI/LLM** | OpenAI API | - |
| **Storage** | S3-compatible | - |

## 1.2 Architecture Globale

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐    │
│  │ Dashboard   │  │ Chat Public │  │ Widget      │  │ API Direct  │    │
│  │ (Creator)   │  │ Standalone  │  │ Embed       │  │ (Future)    │    │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘    │
└─────────┼────────────────┼────────────────┼────────────────┼────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         APPS/WEB (Next.js 15)                           │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ App Router: (public) | (auth) | (dashboard) | /chat | /embed     │   │
│  └──────────────────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │ Server Components | Client Components | API Routes               │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         APPS/API (NestJS 11)                            │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Modules: Auth | Users | AIs | Documents | Conversations           │ │
│  └────────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Guards | Pipes | Interceptors | DTOs                              │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ├──────────────────────┬──────────────────────┐
          ▼                      ▼                      ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   PostgreSQL     │  │   Qdrant         │  │   S3 Storage     │
│   (Prisma ORM)   │  │   (Vectors)      │  │   (Documents)    │
└──────────────────┘  └──────────────────┘  └──────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       APPS/AI-WORKER (Node.js)                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │ Jobs: Document Processing | Chunking | Embedding | RAG Pipeline   │ │
│  └────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

---

# 2. ARCHITECTURE BACKEND (API)

## 2.1 Structure des Modules

```
apps/api/src/
├── main.ts                    # Bootstrap NestJS
├── app.module.ts              # Module racine
├── common/
│   ├── guards/                # Auth guards
│   ├── decorators/            # @CurrentUser, etc.
│   ├── pipes/                 # Validation pipes
│   └── interceptors/          # Transform, logging
│
└── modules/
    ├── auth/                  # Better Auth integration
    │   ├── auth.module.ts
    │   ├── auth.controller.ts
    │   └── auth.service.ts
    │
    ├── users/                 # Gestion profils
    │   ├── users.module.ts
    │   ├── users.controller.ts
    │   ├── users.service.ts
    │   └── dto/
    │
    ├── ais/                   # CRUD Assistants IA
    │   ├── ais.module.ts
    │   ├── ais.controller.ts
    │   ├── ais.service.ts
    │   └── dto/
    │
    ├── documents/             # Upload & indexation
    │   ├── documents.module.ts
    │   ├── documents.controller.ts
    │   ├── documents.service.ts
    │   └── dto/
    │
    └── conversations/         # Chat & messages
        ├── conversations.module.ts
        ├── conversations.controller.ts
        ├── conversations.service.ts
        └── dto/
```

## 2.2 Endpoints API

### Auth (Better Auth)
```
POST   /auth/sign-up/email         # Inscription
POST   /auth/sign-in/email         # Connexion
POST   /auth/sign-out              # Déconnexion
GET    /auth/session               # Session courante
POST   /auth/forgot-password       # Reset password
```

### Users (Authentifié)
```
GET    /users/me                   # Profil utilisateur
PATCH  /users/me                   # Mise à jour profil
GET    /users/me/stats             # Statistiques dashboard
```

### AIs (Authentifié)
```
GET    /ais                        # Liste AIs
POST   /ais                        # Créer AI
GET    /ais/:id                    # Détail AI
PATCH  /ais/:id                    # Modifier AI
DELETE /ais/:id                    # Supprimer AI
GET    /ais/:id/stats              # Stats AI
```

### Documents (Authentifié)
```
GET    /ais/:aiId/documents        # Liste documents
POST   /ais/:aiId/documents        # Ajouter document
GET    /ais/:aiId/documents/:id    # Détail document
DELETE /ais/:aiId/documents/:id    # Supprimer document
POST   /ais/:aiId/documents/:id/retry  # Réessayer indexation
```

### Conversations (Mixte)
```
# Créateur (authentifié)
GET    /ais/:aiId/conversations    # Liste conversations
DELETE /conversations/:id          # Supprimer conversation

# Public (non authentifié)
POST   /chat/:aiSlug/start         # Démarrer conversation
GET    /chat/conversations/:id     # Récupérer conversation
POST   /chat/conversations/:id/messages  # Envoyer message
```

## 2.3 Modèle de Données (Prisma)

```prisma
// Utilisateurs & Auth
model User {
  id                 String             @id @default(cuid())
  email              String             @unique
  name               String?
  avatar             String?
  subscriptionPlan   SubscriptionPlan   @default(FREE)
  subscriptionStatus SubscriptionStatus @default(ACTIVE)
  ais                AI[]
  sessions           Session[]
}

// Assistants IA
model AI {
  id            String     @id @default(cuid())
  userId        String
  slug          String     @unique
  name          String
  description   String?
  status        AIStatus   @default(DRAFT)
  systemPrompt  String?
  primaryColor  String     @default("#3b82f6")
  temperature   Float      @default(0.7)
  maxTokens     Int        @default(1024)
  accessType    AccessType @default(FREE)

  user          User           @relation(...)
  documents     Document[]
  conversations Conversation[]
}

// Documents & Chunks
model Document {
  id         String         @id @default(cuid())
  aiId       String
  filename   String
  mimeType   String
  size       Int
  status     DocumentStatus @default(PENDING)
  chunkCount Int            @default(0)

  ai         AI      @relation(...)
  chunks     Chunk[]
}

model Chunk {
  id            String @id @default(cuid())
  documentId    String
  content       String
  position      Int
  qdrantPointId String? @unique
}

// Conversations & Messages
model Conversation {
  id           String    @id @default(cuid())
  aiId         String
  endUserId    String?
  title        String?
  messageCount Int       @default(0)

  ai           AI        @relation(...)
  messages     Message[]
}

model Message {
  id             String          @id @default(cuid())
  conversationId String
  role           MessageRole
  content        String
  sources        Json?
  confidence     ConfidenceLevel?
}
```

## 2.4 Enums

```typescript
enum SubscriptionPlan { FREE, CREATOR, PRO, ENTERPRISE }
enum SubscriptionStatus { ACTIVE, CANCELED, PAST_DUE, TRIALING }
enum AIStatus { DRAFT, ACTIVE, PAUSED, ARCHIVED }
enum AccessType { FREE, PAID, INVITE_ONLY, TIME_LIMITED }
enum DocumentStatus { PENDING, PROCESSING, INDEXED, FAILED }
enum MessageRole { USER, ASSISTANT }
enum ConfidenceLevel { HIGH, MEDIUM, LOW }
```

---

# 3. ARCHITECTURE FRONTEND (WEB)

## 3.1 Structure des Routes

```
apps/web/src/app/
│
├── (public)/                      # Routes publiques
│   ├── layout.tsx                 # Navbar marketing
│   ├── page.tsx                   # Landing page
│   └── pricing/page.tsx           # Pricing détaillé
│
├── (auth)/                        # Routes auth
│   ├── layout.tsx                 # Layout centré
│   ├── sign-in/page.tsx
│   ├── sign-up/page.tsx
│   └── forgot-password/page.tsx
│
├── (dashboard)/                   # Routes protégées
│   ├── layout.tsx                 # DashboardLayout + Sidebar
│   ├── dashboard/page.tsx         # Overview
│   ├── ais/
│   │   ├── page.tsx               # Liste AIs
│   │   ├── new/page.tsx           # Wizard création
│   │   └── [id]/
│   │       ├── page.tsx           # Overview AI
│   │       ├── documents/page.tsx
│   │       ├── conversations/page.tsx
│   │       ├── settings/page.tsx
│   │       └── embed/page.tsx
│   ├── settings/
│   │   ├── page.tsx               # Profil
│   │   └── billing/page.tsx
│   └── onboarding/page.tsx
│
├── chat/[slug]/page.tsx           # Widget standalone
├── embed/[slug]/page.tsx          # Widget iframe
│
├── layout.tsx                     # Root layout
├── globals.css                    # Styles Tailwind
└── middleware.ts                  # Auth guard
```

## 3.2 Design System

### Palette (Dark Theme)
```css
--background: 240 10% 3.9%;     /* #0a0a0f */
--foreground: 0 0% 98%;
--card: 240 10% 5.9%;
--primary: 221 83% 53%;         /* Bleu-violet */
--muted: 240 5% 15%;
--destructive: 0 62% 50%;
--border: 240 5% 17%;
```

### Typographie
- Sans: Inter, system-ui
- Mono: JetBrains Mono

### Composants UI (Atomic Design)

**Atoms existants:** Button, Input, Label, Badge, Avatar, Skeleton, Separator

**Atoms à créer:**
- Tabs, Select, Switch, Textarea, Slider, Progress

**Molecules existantes:** Card, Tooltip

**Molecules à créer:**
- FormField, StatCard, SearchBar, EmptyState
- Breadcrumb, DropdownMenu, CodeBlock, SlugInput

**Organisms existants:** ChatInterface, DocumentUploader, ConversationList, SourceCitation

**Organisms à créer:**
- Sidebar, DashboardHeader, AICard, DocumentList
- ConversationDetail, ActivityFeed, WizardStepper
- SettingsForm, EmbedPreview, GlobalSearch

**Templates à créer:**
- DashboardLayout, AuthLayout, ChatLayout, EmbedLayout

## 3.3 Dashboard Design

### Sidebar (280px / 64px)
```
┌─────────────────────────────┐
│ [C] CorpusAI    [Upgrade]   │
├─────────────────────────────┤
│ 🏠 Dashboard                │
│ 🤖 Mes AIs         (3)      │
│ 📊 Analytics                │
├─────────────────────────────┤
│ MES AIS                     │
│   📁 FAQ Support            │
│   📁 Doc Technique          │
│   + Créer un AI             │
├─────────────────────────────┤
│ ⚙️ Settings                 │
│ 📖 Documentation            │
├─────────────────────────────┤
│ 👤 User                     │
│    email@example.com        │
└─────────────────────────────┘
```

### Header
```
┌──────────────────────────────────────────────┐
│ ☰  Breadcrumb          [🔍 Cmd+K] [🔔] [👤] │
└──────────────────────────────────────────────┘
```

## 3.4 Pages Principales

### Dashboard (`/dashboard`)
- 4 StatCards (AIs, Documents, Questions, Conversations)
- Activité récente
- Aperçu AIs

### Liste AIs (`/ais`)
- Search + filtres
- AICards en liste
- Empty state

### Détail AI (`/ais/[id]`)
Tabs: Overview | Documents | Conversations | Settings | Embed

### Wizard Création (`/ais/new`)
4 étapes: Infos → Documents → Prompt → Récap

---

# 4. ARCHITECTURE AI-WORKER

## 4.1 Pipeline RAG

```
┌─────────────────────────────────────────────────────────────────┐
│                      DOCUMENT PROCESSING                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Upload → Parse → Chunk → Embed → Store Vectors                 │
│     │        │       │       │           │                      │
│     ▼        ▼       ▼       ▼           ▼                      │
│    S3    Parsers  Strategy  OpenAI    Qdrant                    │
│          (PDF,    (fixed,   Embeddings Collection               │
│          DOCX,    semantic,                                     │
│          TXT...)  sliding)                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        RAG PIPELINE                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Query → Embed → Search → Rerank → Context → LLM → Response     │
│     │       │        │        │        │       │        │       │
│     ▼       ▼        ▼        ▼        ▼       ▼        ▼       │
│  User   OpenAI   Qdrant   Score    Build   OpenAI  Stream      │
│  Input  Embed    Vectors  Filter   Prompt  Chat    to Client   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 4.2 Jobs

```typescript
// Document Processing Job
async processDocument(documentId: string) {
  1. Fetch document from S3
  2. Parse content (PDF → text, etc.)
  3. Chunk content (500-1000 tokens)
  4. Generate embeddings (batch)
  5. Store in Qdrant
  6. Update document status → INDEXED
}

// RAG Query Job
async generateResponse(conversationId: string, query: string) {
  1. Get AI config (system prompt, temperature)
  2. Embed query
  3. Search similar chunks in Qdrant
  4. Build context with sources
  5. Call LLM with streaming
  6. Save message with sources
  7. Return streamed response
}
```

---

# 5. FLUX UTILISATEURS

## 5.1 Onboarding
```
Sign Up → Email Verify → /onboarding → Template → Nom/Slug → Upload Doc → Dashboard
```

## 5.2 Création AI
```
Dashboard → + Créer → Wizard (4 steps) → AI DRAFT → Activer → ACTIVE
```

## 5.3 Upload Documents
```
Page Docs → Drag & Drop → Validation → Upload S3 → PROCESSING → Worker → INDEXED/FAILED
```

## 5.4 Chat Public
```
/chat/slug → Load AI config → Start conversation → Send message → RAG → Stream response
```

---

# 6. SÉCURITÉ

## 6.1 Authentication
- Better Auth (sessions, OAuth)
- Middleware Next.js pour routes protégées
- Guards NestJS pour API

## 6.2 Authorization
- Ownership checks sur AIs/Documents
- Rate limiting par plan
- CORS configuré

## 6.3 Validation
- DTOs avec class-validator
- Sanitization des inputs
- File type/size validation

---

# 7. PHASES D'IMPLÉMENTATION

## Phase 1: Foundation
- [ ] Templates: DashboardLayout, AuthLayout
- [ ] Atoms: Tabs, Select, Switch, Textarea
- [ ] Pages Auth: sign-in, sign-up
- [ ] Middleware auth

## Phase 2: Dashboard Core
- [ ] Organisms: Sidebar, DashboardHeader
- [ ] Molecules: StatCard, EmptyState, AICard
- [ ] Pages: Dashboard, Liste AIs

## Phase 3: AI Management
- [ ] Page Détail AI avec tabs
- [ ] Wizard création
- [ ] DocumentList, SettingsForm
- [ ] Upload S3

## Phase 4: RAG Pipeline
- [ ] Document processing worker
- [ ] Chunking strategies
- [ ] Qdrant integration
- [ ] RAG query pipeline

## Phase 5: Chat & Widget
- [ ] Page Conversations
- [ ] Chat public /chat/[slug]
- [ ] Embed /embed/[slug]
- [ ] Streaming responses

## Phase 6: Polish
- [ ] Settings utilisateur
- [ ] Onboarding flow
- [ ] Analytics
- [ ] Global search (Cmd+K)
