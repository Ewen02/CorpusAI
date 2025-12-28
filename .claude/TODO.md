# CorpusAI - Todo List

## Légende

- ✅ Fait
- 🔄 En cours
- ⏳ À faire
- ❌ Bloqué

---

## Infrastructure & Setup

- [x] Initialiser monorepo (pnpm + turbo)
- [x] Configurer TypeScript (base, library, nestjs, nextjs)
- [x] Créer .claude/CLAUDE.md (règles dev)
- [ ] Configurer ESLint partagé

---

## Packages

### @corpusai/types
- [x] Enums (AIStatus, DocumentStatus, SubscriptionPlan)
- [x] Interfaces (AIData, DocumentData, MessageData)
- [x] API responses (ApiResponse, PaginatedResponse)
- [x] Build fonctionnel

### @corpusai/subscription
- [x] Feature limits par plan
- [x] Helpers (canCreateAI, canUploadDocument)
- [x] Pricing
- [x] Build fonctionnel

### @corpusai/ai-rules
- [x] Behavior rules config
- [x] System prompt builder
- [x] Response validation
- [x] Confidence helpers
- [x] Build fonctionnel

### @corpusai/database
- [x] Setup Prisma
- [x] Schéma Creator, AI, Document
- [x] Schéma Conversation, Message
- [x] Schéma Subscription, Access
- [x] Schéma Better Auth (User, Session, Account, Verification)
- [x] Database synced (prisma db push)

### @corpusai/ui
- [x] Setup package avec shadcn
- [x] Atoms (Button, Input, Badge)
- [x] Molecules (Card, FormField)
- [x] Organisms (ChatInterface, DocumentUploader, ConversationList, SourceCitation)
- [ ] Intégration dans apps/web

### @corpusai/corpus
- [ ] Chunking strategies
- [ ] Document processing
- [ ] Qdrant integration

---

## Apps

### apps/web (Next.js)
- [x] Setup Next.js 15
- [x] Tailwind + Design System
- [x] Landing page basique
- [x] Pages auth (sign-in, sign-up)
- [x] OAuth Google & GitHub
- [x] Page onboarding
- [x] Dashboard layout avec session
- [x] Logout fonctionnel
- [ ] Dashboard créateur (contenu)
- [ ] Page création IA
- [ ] Interface chat
- [ ] Widget embeddable

### apps/api (NestJS)
- [x] Setup NestJS 11
- [x] Swagger docs
- [x] Health check
- [x] Module Auth (Better Auth + OAuth)
- [x] Module AIs
- [x] Module Documents
- [x] Module Conversations
- [ ] Module Subscriptions

### apps/ai-worker
- [x] Setup basique
- [x] Script experiment:embeddings
- [ ] Script experiment:qdrant
- [ ] Script experiment:chunking
- [ ] Script experiment:rag
- [ ] Services production

---

## Apprentissage IA/RAG

- [ ] Comprendre les embeddings (OpenAI)
- [ ] Manipuler Qdrant (collections, points, search)
- [ ] Implémenter chunking
- [ ] Construire pipeline RAG minimal
- [ ] Prompt engineering pour citations

---

## Prochaines Actions Immédiates

1. ✅ **Auth fonctionnelle** - Email/password + OAuth Google/GitHub
2. ⏳ Dashboard créateur (contenu réel)
3. ⏳ Page création IA
4. ⏳ Module Subscriptions API
5. ⏳ Scripts ai-worker (qdrant, chunking, rag)
