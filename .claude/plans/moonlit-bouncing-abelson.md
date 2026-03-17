# Plan d'action — Optimisation CorpusAI

## Contexte

L'audit `/optimize` a identifie 47 findings sur 6 domaines (frontend, backend, database, RAG, bundle, DX). Ce plan organise les corrections en 3 sprints par ordre d'impact. On ne touche pas a l'architecture — uniquement du refacto, clean code, perf et best practices.

**Corrections par rapport a l'audit initial :**
- `apps/web/src/app/page.tsx` est deja un Server Component (pas de "use client")
- `features`/`plans` arrays sont deja au niveau module (pas dans le composant)
- `shared/ownership.ts` a deja 4 fonctions — mais elles ne sont pas utilisees dans tous les services

---

## Sprint A — Quick Wins (S, < 1h chacun)

### A.1 React.memo sur composants chat
**Fichier:** `packages/ui/src/organisms/chat-interface.tsx`
- Wrapper `MessageBubble` (L61-158) avec `React.memo()`
- Wrapper `TypingIndicator` (L160-184) avec `React.memo()`
- Wrapper `WelcomeMessage` (L186-216) avec `React.memo()`
- Extraire `SendIcon` (L342-357) hors du composant

### A.2 Accessibilite chat
**Fichier:** `packages/ui/src/organisms/chat-interface.tsx`
- L101: Ajouter `aria-label="AI is typing" role="status"` au streaming indicator
**Fichier:** `packages/ui/src/organisms/conversation-list.tsx`
- L126-139: Rendre le bouton delete focusable au clavier + `aria-label="Delete conversation"`

### A.3 Index compound Document(aiId, status)
**Fichier:** `packages/database/prisma/schema.prisma`
- Remplacer les 2 index separés `@@index([aiId])` + `@@index([status])` par `@@index([aiId, status])`

### A.4 Fix Logger dans UsersService
**Fichier:** `apps/api/src/modules/users/users.service.ts`
- L239: Deplacer `new Logger('UsersService')` en propriete de classe

### A.5 Silent catch → logged catch
**Fichier:** `apps/api/src/modules/auth/api-key.guard.ts`
- L50-52: Remplacer `.catch(() => {})` par `.catch((err) => logger.warn(...))`

### A.6 DTO validation sur API publique
**Fichier:** `apps/api/src/modules/public-api/public-api.controller.ts`
- L65-66: Creer `QueryPublicApiDto` avec `@IsString() @MaxLength(2000)` pour slug et question
**Fichier a creer:** `apps/api/src/modules/public-api/dto/query.dto.ts`

### A.7 Centraliser score threshold
**Fichier:** `packages/types/src/index.ts` (ou constants)
- Ajouter `DEFAULT_SCORE_THRESHOLD = 0.6`
- Mettre a jour: `packages/corpus/src/rag/pipeline.ts:194`, `apps/api/src/modules/conversations/conversations.service.ts:287`, `apps/api/src/modules/rag/rag.service.ts:202`

### A.8 Embedding cache TTL configurable
**Fichier:** `apps/api/src/modules/rag/rag-pipeline.factory.ts:71`
- Remplacer `604800` par `parseInt(process.env.EMBEDDING_CACHE_TTL ?? '604800')`

### A.9 Env vars obligatoires en production
**Fichier:** `apps/api/src/modules/rag/rag-pipeline.factory.ts:187`
- Ajouter: `if (!qdrantUrl && process.env.NODE_ENV === 'production') throw new Error(...)`
**Fichier:** `apps/api/src/lib/auth.ts:29`
- Meme pattern pour BETTER_AUTH_URL

### A.10 Debounce sur recherche AIs
**Fichier:** `apps/web/src/app/(dashboard)/ais/page.tsx:52-54`
- Remplacer `setSearchQuery` direct par `useDeferredValue` ou un hook `useDebounce(300)`

### A.11 Retirer unoptimized sur images
**Fichiers:** `apps/web/src/app/chat/[slug]/chat-page.tsx:134`, `apps/web/src/app/embed/[slug]/embed-widget.tsx:339`
- Supprimer `unoptimized={true}` des `<Image />`

---

## Sprint B — Refactors moyens (M, 1-4h chacun)

### B.1 Extraire logique chat partagee (deduplication)
**Fichiers source:** `apps/web/src/lib/hooks/use-public-chat.ts` + `apps/web/src/app/embed/[slug]/embed-widget.tsx`
**Fichier a creer:** `apps/web/src/lib/utils/chat-session.ts`
- Extraire `generateSessionId()`, `getOrCreateSessionId()`, `mapSourcesToChat()`
- Importer dans les 2 fichiers sources

### B.2 Lazy-load markdown + syntax highlighter
**Fichier:** `packages/ui/src/molecules/markdown-renderer.tsx:4-6`
- Remplacer imports statiques de `react-markdown` et `react-syntax-highlighter` par `React.lazy()`
- Ajouter `<Suspense>` fallback

### B.3 Pagination sur getMessages()
**Fichier:** `apps/api/src/modules/conversations/conversations.service.ts:136-158`
- Ajouter params `take: 50` par defaut + `cursor` optionnel
- Mettre a jour le controller pour accepter les params de pagination

### B.4 Cache admin dashboard (Redis 5min)
**Fichier:** `apps/api/src/modules/admin/admin.service.ts:6-52`
- Cacher le resultat de `getDashboard()` dans Redis avec TTL 5 minutes
- Key: `admin:dashboard`

### B.5 staleTime/gcTime par query
**Fichier:** `apps/web/src/lib/queries/use-ai.ts` et tous les hooks dans `queries/`
- Analytics: `staleTime: 30 * 60 * 1000` (30min)
- Documents: `staleTime: 10 * 1000` (10s)
- AIs: `staleTime: 5 * 60 * 1000` (5min)
- Dashboard: `staleTime: 2 * 60 * 1000` (2min)

### B.6 Centraliser les icones SVG inline
**Fichiers:** `chat-interface.tsx`, `markdown-renderer.tsx`, `document-uploader.tsx`, `conversation-list.tsx`
**Fichier a creer:** `packages/ui/src/atoms/icons.tsx`
- Extraire SendIcon, CopyIcon, CheckIcon, UploadIcon, FileIcon, XIcon, PlusIcon, TrashIcon, MessageIcon
- Importer depuis `@corpusai/ui` dans tous les fichiers

### B.7 Utiliser ownership.ts partout
**Fichiers:** `documents.service.ts`, `conversations.service.ts`
- Remplacer les `findFirst({ where: { id, userId } })` manuels par les fonctions existantes de `shared/ownership.ts`
- Verifier que `verifyAIOwnership`, `verifyDocumentOwnership`, `verifyConversationOwnership` sont utilises

### B.8 Extraire rate limit check en methode privee
**Fichier:** `apps/api/src/modules/conversations/conversations.service.ts`
- L247-255 et L410-416: meme query dupliquee
- Extraire en `private async checkDailyRateLimit(aiId: string, plan: SubscriptionPlan)`

---

## Sprint C — Refactors lourds (L, 4h+)

### C.1 Soft deletes User/AI
**Fichier:** `packages/database/prisma/schema.prisma`
- Ajouter `deletedAt DateTime?` sur User et AI
- Modifier les queries pour filtrer `where: { deletedAt: null }`
- Remplacer cascade delete par un cleanup job async
**Impact:** Tous les services qui query User/AI

### C.2 Cleanup vectors on failed indexing
**Fichier:** `apps/ai-worker/src/processors/document-processor.ts:131-169`
- Tracker les chunk IDs inseres pendant l'indexation
- En cas d'erreur: appeler `ragPipeline.deleteDocumentVectors()` pour cleanup
- Assurer l'idempotence du retry

### C.3 Decorator @CheckSubscriptionLimit
**Fichier a creer:** `apps/api/src/common/decorators/check-subscription-limit.decorator.ts`
- NestJS custom decorator + guard qui verifie les limites du plan
- Remplacer les 6+ checks manuels dans documents.service.ts et ais.service.ts

---

## Ordre d'execution recommande

1. **Sprint A** en premier — tous les quick wins en un seul commit par scope
2. **Sprint B.1-B.3** — deduplication + lazy load + pagination (impact perf immediat)
3. **Sprint B.4-B.8** — cache, query tuning, cleanup code
4. **Sprint C** — seulement si production planned

## Verification

Apres chaque sprint :
1. `pnpm typecheck` — tous les packages passent
2. `pnpm test` — 218+ tests passent
3. Test manuel : ouvrir `/chat/[slug]`, envoyer messages, verifier que le streaming fonctionne
4. Verifier bundle size avant/apres lazy loading (`pnpm --filter @corpusai/web build`)
