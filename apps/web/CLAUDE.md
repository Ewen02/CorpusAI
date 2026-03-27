# apps/web — Next.js 15 Frontend

## Stack

- Next.js 15 (App Router), React 19, TypeScript strict
- Tailwind CSS, composants depuis `@corpusai/ui`
- React Query (`@tanstack/react-query`) pour le data fetching
- Better Auth pour l'authentification créateur
- Magic link + `eu_session` cookie pour l'auth end-user
- Recharts pour les graphiques

## Routes

```
src/app/
├── page.tsx                              # Landing page marketing
├── (auth)/sign-in, sign-up              # Pages auth créateur
├── onboarding/                          # Post-inscription (wizard multi-steps)
├── (dashboard)/
│   ├── dashboard/                       # Overview + stats
│   ├── ais/                             # Liste AIs
│   ├── ais/new/                         # Creation AI (wizard 3 tabs)
│   ├── ais/[id]/                        # Detail AI (tabs: chat, docs, conversations, analytics, debug)
│   ├── ais/[id]/settings/               # Config AI (tabs: général, accès, intégration, danger)
│   ├── analytics/                       # Dashboard analytics global (Recharts)
│   ├── settings/                        # Profil utilisateur
│   ├── settings/billing/                # Abonnement
│   ├── settings/security/               # Securite
│   └── settings/notifications/          # Notifications
├── chat/[slug]/                         # Chat public (/chat/[slug]?t=TOKEN ou ?code=CODE)
├── embed/[slug]/                        # Widget chat embeddable (iframe, ?token=, ?code=)
├── portal/
│   ├── sign-in/                         # Auth end-user (magic link, ?callbackUrl=, ?aiSlug=)
│   ├── auth/verify/                     # Callback magic link → cookie eu_session → redirect
│   └── conversations/                   # Liste + détail conversations end-user
└── api/rag/[aiId]/debug-query/          # Next.js API route (proxy RAG debug)
```

## Data Fetching

Utiliser les hooks React Query depuis `src/lib/queries/` :

```typescript
// Hooks créateur
import { useAIs, useAI, useCreateAI, useUpdateAI, useDeleteAI } from '@/lib/queries/use-ai';
import {
  useDocuments,
  useUploadFiles,
  useDeleteDocument,
  useRetryDocument,
} from '@/lib/queries/use-documents';
import { useConversations, useStartConversation } from '@/lib/queries/use-conversations';
import { useMessages } from '@/lib/queries/use-messages';
import { useDashboardStats } from '@/lib/queries/use-dashboard';
import { useAnalytics, useAIAnalytics } from '@/lib/queries/use-analytics';

// Access control (paramètres IA)
import {
  useAIMembers,
  useGenerateAccessToken,
  useDeleteAccessToken,
  useSetAccessCode,
  useDeleteAccessCode,
  useUpdateInviteOnly,
  useInviteMember,
  useRevokeMember,
} from '@/lib/queries/use-ai-access';

// Portail end-user
import {
  usePortalMe,
  usePortalConversations,
  usePortalConversation,
  useSendMagicLink,
  usePortalSignOut,
} from '@/lib/queries/use-portal';
```

- Query key factory pattern : `aiKeys.detail(id)`, `aiKeys.lists()`
- Invalider les queries apres mutations : `queryClient.invalidateQueries()`
- Config QueryClient : staleTime=60s, retry=1, refetchOnWindowFocus=false

## API Client

`src/lib/api-client.ts` wrape fetch avec credentials et gestion d'erreurs :

```typescript
import { apiClient } from '@/lib/api-client';

// GET
const data = await apiClient.get<AIData[]>('/ais');
// POST
const ai = await apiClient.post<AIData>('/ais', body);
// PATCH
await apiClient.patch(`/ais/${id}`, body);
// DELETE
await apiClient.delete(`/ais/${id}`);
// SSE streaming
apiClient.streamMessage(conversationId, content, { onToken, onSources, onDone, onError });
```

## Authentication

Deux systèmes d'auth **totalement parallèles et indépendants** :

### Créateur (Better Auth)

- Client : `authClient` depuis `src/lib/auth-client.ts`
- Hook session : `authClient.useSession()`
- Sign-in : `authClient.signIn.email({ email, password })`
- Sign-out : `authClient.signOut()` puis redirect `/sign-in`
- Cookie : `better-auth.session_token`
- Middleware protège : `/dashboard`, `/ais`, `/settings`, `/onboarding`

### End-User (magic link + eu_session)

- Connexion : `POST /portal/auth/magic-link` → email avec lien 15 min
- Callback : `GET /portal/auth/verify` → pose cookie `eu_session` (7 jours)
- Flow callbackUrl : stocker en `sessionStorage` avant envoi magic link → lire dans `/portal/conversations` au montage → redirect
- Middleware protège : tous les `/portal/*` sauf `/portal/sign-in` et `/portal/auth`

## Public Chat (`usePublicChat` hook)

Le hook `src/lib/hooks/use-public-chat.ts` gère l'accès aux chats publics :

- `accessDeniedReason: 'access_token' | 'access_code' | 'invite_only' | 'ai_inactive' | null`
- Cas `invite_only` : afficher bouton "Se connecter" → `/portal/sign-in?callbackUrl=/chat/[slug]&aiSlug=[slug]`
- Cas `access_code` : modal de saisie du code
- Cas `access_token` : token passé automatiquement depuis l'URL `?t=TOKEN`

## Organisation des composants

**Règle : où créer un composant ?**

```
→ @corpusai/ui           si : utilisé dans 2+ routes OU purement visuel sans logique métier
→ src/components/        si : spécifique à l'app web, partagé entre 2+ routes
→ [route]/components/    si : spécifique à une seule route (1 fichier = 1 composant)
→ inline dans le fichier si : < ~15 lignes, jamais référencé ailleurs
```

**Règle : taille de fichier** — max ~300 lignes par composant. Au-delà → extraire les sous-composants.

**Règle : icônes** — toujours `lucide-react` ou `@corpusai/ui/atoms/icons`. Jamais de SVG inline sauf animation custom complexe → fichier dédié `*-icons.tsx`.

**Règle : classes Tailwind répétées** — si une chaîne est utilisée 3+ fois → extraire en constante ou composant.

**TOUJOURS importer depuis `@corpusai/ui`**, jamais de chemins relatifs vers packages/ui :

```typescript
import {
  Button,
  Card,
  Input,
  Skeleton,
  Badge,
  Tabs,
  AnalyticsCard,
  IconBox,
  SectionHeader,
} from '@corpusai/ui';
```

Composants locaux dans `src/components/` : ai-card, empty-states, skeletons, form-alert.

## Loading States

- Skeleton components dans `src/components/skeletons/`
- Chaque page majeure a son skeleton dedie (ais-page-skeleton, dashboard-skeleton...)

## Streaming Chat

```typescript
const { sendMessage, isStreaming } = useChatState(conversationId);
// Le hook gere : optimistic updates, streaming SSE, sources, confidence
```

## Fichiers cles

| Fichier                                          | Role                                                |
| ------------------------------------------------ | --------------------------------------------------- |
| `src/lib/api-client.ts`                          | Fetch wrapper typé avec SSE streaming               |
| `src/lib/auth-client.ts`                         | Client Better Auth (créateur)                       |
| `src/lib/queries/`                               | Hooks React Query (use-ai, use-documents, etc.)     |
| `src/lib/queries/use-ai-access.ts`               | Hooks access control (token, code, invite, members) |
| `src/lib/queries/use-portal.ts`                  | Hooks portail end-user                              |
| `src/lib/query-client.ts`                        | QueryClient factory (server/browser)                |
| `src/lib/hooks/use-public-chat.ts`               | Hook chat public (accès, accessDeniedReason)        |
| `src/components/`                                | Composants partagés (skeletons, cards...)           |
| `src/app/(dashboard)/layout.tsx`                 | Layout dashboard avec sidebar                       |
| `src/app/(dashboard)/ais/[id]/settings/page.tsx` | Settings AI (AccessTab init depuis ai.inviteOnly)   |
| `src/app/portal/sign-in/page.tsx`                | Auth end-user (callbackUrl sessionStorage)          |
| `src/app/portal/conversations/page.tsx`          | Liste conversations + redirect post-login           |
| `src/middleware.ts`                              | Protection routes créateur + portail                |

## Clean Code Rules

### File size limits

- **Max 300 lignes par fichier** — au-delà, extraire des sous-composants, hooks, ou helpers
- **1 composant exporté par fichier** — pas de sous-composants `function` avant le `export default`
- Les petits composants inline (< 15 lignes, jamais réutilisés) sont acceptés

### Structure d'une route complexe

```
route/
├── page.tsx              # Page principale (< 300 lignes, orchestration)
├── components/           # Sous-composants spécifiques à cette route
│   ├── my-tab.tsx
│   └── my-card.tsx
├── hooks/                # Hooks custom spécifiques à cette route
│   └── use-my-state.ts
├── constants.ts          # Constantes, enums, mappings de couleurs
└── utils.ts              # Helpers purs (formatage, calculs)
```

### Extraction obligatoire

- **Sous-composant > 50 lignes** → fichier séparé dans `components/`
- **Hook custom > 30 lignes** → fichier séparé dans `hooks/`
- **Constantes de config/couleurs** (mappings, options de select, etc.) → `constants.ts`
- **Fonctions utilitaires** (formatage de dates, calculs) → `utils.ts`
- **Types/interfaces spécifiques** à une route → `types.ts` (sinon `@corpusai/types`)

### Classes Tailwind

- **Classe réutilisée 3+ fois** → extraire en constante ou composant
- **Icônes** → toujours `lucide-react`, jamais de SVG inline
- **Styles du dark theme** → utiliser les CSS variables : `text-tx-primary`, `text-tx-muted`, `bg-[hsl(var(--surface-1))]`, `border-[hsl(var(--border-subtle))]`

### Patterns interdits

- ❌ `function MyComponent()` avant `export default` dans le même fichier (sauf < 15 lignes)
- ❌ SVG inline — utiliser `lucide-react` ou composant dédié `*-icons.tsx`
- ❌ Plus de 10 `useState` dans un composant — extraire un hook custom
- ❌ `as any` — préférer des types stricts ou `unknown` + narrowing
- ❌ Raw `fetch` dans les composants — utiliser `apiClient` + React Query hooks

## Checklist qualite

- [ ] TypeScript strict, pas de `any`
- [ ] Composants responsive (mobile-first)
- [ ] Loading states avec Skeleton
- [ ] Imports depuis `@corpusai/ui` (pas de chemins relatifs)
- [ ] React Query hooks, pas de raw fetch dans les composants
- [ ] Invalider les queries apres mutations
- [ ] Bien distinguer auth créateur (authClient) vs end-user (portal)
- [ ] Cas `invite_only` dans chat public → bouton vers portal/sign-in (pas juste message d'erreur)
- [ ] callbackUrl via sessionStorage pour flow magic link post-login redirect
- [ ] Fichiers < 300 lignes (extraire si besoin)
- [ ] Pas de sous-composants inline > 50 lignes
- [ ] Constantes/helpers dans des fichiers dédiés
