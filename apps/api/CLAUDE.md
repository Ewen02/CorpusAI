# apps/api — NestJS 11 Backend

## Stack

- NestJS 11, TypeScript strict
- Prisma 6 via `@corpusai/database` (import direct du singleton `prisma`)
- Better Auth (sessions cookie, pas de JWT)
- BullMQ pour la queue de traitement documents
- Swagger/OpenAPI a `/docs`
- class-validator + class-transformer pour DTOs

## Structure

```
src/
├── modules/
│   ├── auth/            # Better Auth + AuthGuard + @CurrentUser
│   ├── users/           # Profil, stats, analytics, comptes OAuth
│   ├── ais/             # CRUD AIs + access control (token/code/invite/members)
│   ├── documents/       # Upload, retry, delete, SSE progress
│   ├── conversations/   # Chat public (widget) + creator + streaming SSE
│   ├── end-user-auth/   # Auth end-user : magic link, cookie eu_session, EndUserAuthGuard
│   ├── mail/            # MailModule (Resend) : sendMagicLink, sendInvite
│   ├── portal/          # Portail end-user : GET me/conversations/[id]
│   └── rag/             # TextGenerationService, debug query, metriques cache
├── shared/
│   ├── ownership.ts          # verifyAIOwnership, getOwnedAI, ...
│   ├── subscription-checks.ts # assertCanCreateAI, assertCanAddDocument, assertCanAddEndUser
│   └── date-utils.ts         # Helpers date
├── lib/
│   └── auth.ts          # Config Better Auth (rate limits, cookie attrs, OAuth)
└── main.ts              # Bootstrap, CORS, CSP/HSTS, Swagger, ValidationPipe, port 3001
```

## Pattern module

```
modules/example/
├── example.module.ts      # @Module declaration
├── example.controller.ts  # Routes HTTP + Swagger decorators
├── example.service.ts     # Business logic + Prisma
├── dto/
│   ├── create-example.dto.ts
│   └── update-example.dto.ts
└── index.ts               # Barrel export
```

## Authentication & Authorization

Deux systèmes d'auth **totalement parallèles et indépendants** :

### Créateur (Better Auth)

```typescript
@UseGuards(AuthGuard)          // cookie better-auth.session_token
@CurrentUser() user: CurrentUserData
```

- Guard : `modules/auth/auth.guard.ts` — valide via `auth.api.getSession(fromNodeHeaders(req.headers))`
- Ownership : `shared/ownership.ts` — TOUJOURS vérifier avant d'agir

```typescript
const ai = await getOwnedAI(aiId, user.id); // throws NotFoundException ou ForbiddenException
await verifyDocumentOwnership(docId, user.id);
```

### End-User (magic link + eu_session)

```typescript
@UseGuards(EndUserAuthGuard)   // cookie eu_session (HttpOnly, SameSite=Strict)
@CurrentEndUser() endUser: EndUser
```

- Module : `modules/end-user-auth/` — magic link 15 min → session 7 jours
- Endpoints : `POST /portal/auth/magic-link`, `GET /portal/auth/verify`, `POST /portal/auth/sign-out`
- Ne jamais mélanger AuthGuard et EndUserAuthGuard sur le même controller

## Prisma

```typescript
import { prisma } from '@corpusai/database';

// Toujours limiter les champs avec select/include
const ais = await prisma.aI.findMany({
  where: { creatorId: userId },
  select: { id: true, name: true, slug: true },
  orderBy: { createdAt: 'desc' },
});
```

## Document Processing

1. API recoit le fichier/texte/URL
2. Cree le record Document (status: PENDING) en DB
3. Enqueue un job BullMQ via `@corpusai/queue`
4. ai-worker traite le document de maniere asynchrone
5. SSE endpoint `/ais/:aiId/documents/:id/progress/stream` pour le suivi temps reel

## Error Handling

```typescript
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';

// Utiliser les exceptions NestJS standard
if (!resource) throw new NotFoundException('Resource not found');
if (resource.creatorId !== userId) throw new ForbiddenException('Access denied');
```

## Swagger

```typescript
@Controller("ais")
@ApiTags("AIs")
@ApiBearerAuth()
export class AIsController {
  @Get()
  @ApiOperation({ summary: "List user's AIs" })
  async findAll(@CurrentUser() user: CurrentUserData) { ... }
}
```

## Access Control (AIs)

Trois modes d'accès, vérifiés dans `conversations.service.ts:checkAIAccess()` :

| Mode        | Champ DB         | Vérification                                     |
| ----------- | ---------------- | ------------------------------------------------ |
| OPEN        | —                | Aucune (public)                                  |
| GATED token | `AI.accessToken` | Comparaison directe header `x-access-token`      |
| GATED code  | `AI.accessCode`  | `bcrypt.compare` header `x-access-code`          |
| MEMBER      | `AI.inviteOnly`  | `AIAccessGrant.ACTIVE` non expiré pour l'EndUser |

Endpoints créateur : `POST/DELETE /ais/:id/access/token`, `POST/DELETE /ais/:id/access/code`, `PATCH /ais/:id/access/invite`, `GET/POST/DELETE /ais/:id/members`

UnauthorizedException avec `{ reason: 'access_token' | 'access_code' | 'invite_only' | 'ai_inactive' }`

## Fichiers cles

| Fichier                                            | Role                                                  |
| -------------------------------------------------- | ----------------------------------------------------- |
| `src/main.ts`                                      | Bootstrap, CORS, CSP/HSTS, Swagger, port 3001         |
| `src/lib/auth.ts`                                  | Config Better Auth (rate limits, cookie attrs, OAuth) |
| `src/modules/auth/auth.guard.ts`                   | Validation session créateur (fromNodeHeaders)         |
| `src/modules/end-user-auth/end-user-auth.guard.ts` | Validation session end-user (eu_session)              |
| `src/shared/ownership.ts`                          | Vérification ownership centralisée                    |
| `src/shared/subscription-checks.ts`                | assertCan\* helpers (AI, document, endUser)           |
| `src/modules/mail/mail.service.ts`                 | Resend — sendMagicLink, sendInvite                    |
| `src/modules/portal/portal.service.ts`             | Données portail end-user                              |
| `src/modules/rag/rag-pipeline.factory.ts`          | Crée les instances RAG pipeline                       |

## Checklist qualite

- [ ] Tous les endpoints documentés Swagger (@ApiTags, @ApiOperation)
- [ ] DTOs validés avec class-validator
- [ ] Ownership vérifié via shared/ownership.ts
- [ ] Pas de données sensibles exposées (accessToken/accessCode jamais retournés)
- [ ] TypeScript strict, pas de `any`
- [ ] Subscription limits vérifiés (assertCan\* dans shared/subscription-checks.ts)
- [ ] Bien choisir AuthGuard vs EndUserAuthGuard selon le contexte
