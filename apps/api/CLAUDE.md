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
│   ├── ais/             # CRUD AIs + stats par AI
│   ├── documents/       # Upload, retry, delete, SSE progress
│   ├── conversations/   # Chat public (widget) + creator + streaming SSE
│   └── rag/             # Debug query, metriques cache
├── shared/
│   └── ownership.ts     # verifyAIOwnership, getOwnedAI, verifyDocumentOwnership, verifyConversationOwnership
├── lib/
│   └── auth.ts          # Config Better Auth (zero dep NestJS)
└── main.ts              # Bootstrap, CORS, Swagger, ValidationPipe, port 3001
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

```typescript
// Auth guard sur controller ou methode
@UseGuards(AuthGuard)
@Controller("ais")
export class AIsController { ... }

// Recuperer l'utilisateur
@Get("me")
async getProfile(@CurrentUser() user: CurrentUserData) { ... }
```

- Guard : `modules/auth/auth.guard.ts` — valide session via `auth.api.getSession()`
- Decorator : `modules/auth/current-user.decorator.ts`
- Ownership : `shared/ownership.ts` — TOUJOURS verifier avant d'agir sur une ressource

```typescript
// Pattern ownership standard
const ai = await getOwnedAI(aiId, user.id);     // throws NotFoundException ou ForbiddenException
await verifyDocumentOwnership(docId, user.id);
```

## Prisma

```typescript
import { prisma } from "@corpusai/database";

// Toujours limiter les champs avec select/include
const ais = await prisma.aI.findMany({
  where: { creatorId: userId },
  select: { id: true, name: true, slug: true },
  orderBy: { createdAt: "desc" },
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
import { NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";

// Utiliser les exceptions NestJS standard
if (!resource) throw new NotFoundException("Resource not found");
if (resource.creatorId !== userId) throw new ForbiddenException("Access denied");
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

## Fichiers cles

| Fichier | Role |
|---------|------|
| `src/main.ts` | Bootstrap, CORS, Swagger setup, port 3001 |
| `src/lib/auth.ts` | Config Better Auth (Prisma adapter, OAuth) |
| `src/modules/auth/auth.guard.ts` | Validation session per-request |
| `src/modules/auth/current-user.decorator.ts` | @CurrentUser param decorator |
| `src/shared/ownership.ts` | Verification ownership centralisee |
| `src/modules/rag/rag-pipeline.factory.ts` | Cree les instances RAG pipeline |

## Checklist qualite

- [ ] Tous les endpoints documentes Swagger (@ApiTags, @ApiOperation)
- [ ] DTOs valides avec class-validator
- [ ] Ownership verifie via shared/ownership.ts
- [ ] Pas de donnees sensibles exposees
- [ ] TypeScript strict, pas de `any`
- [ ] Subscription limits verifies pour les operations de creation
