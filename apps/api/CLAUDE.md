# apps/api — NestJS 11 Backend

## Stack & Architecture

NestJS 11, TypeScript strict, Better Auth (cookie sessions), BullMQ, Swagger at `/docs`, class-validator DTOs.

**Hexagonal architecture** : services → repositories → PrismaService (injectable). No direct `prisma` import in services.

```
src/
├── infrastructure/database/  # PrismaService (global), DatabaseModule
├── modules/                  # 16 feature modules (each: controller + service + repository + DTOs + barrel index.ts)
├── shared/                   # OwnershipService (injectable), subscription-checks, date-utils, SharedModule
├── lib/auth.ts               # Better Auth config (rate limits, cookies, OAuth)
└── main.ts                   # Bootstrap, CORS, CSP/HSTS, Swagger, ValidationPipe, port 3001
```

## Authentication (2 independent systems — never mix)

### Creator (Better Auth)

```typescript
@UseGuards(AuthGuard)          // cookie better-auth.session_token
@CurrentUser() user: CurrentUserData
```

Ownership : inject `OwnershipService` — ALWAYS verify before acting.

### End-User (magic link + eu_session)

```typescript
@UseGuards(EndUserAuthGuard)   // cookie eu_session (HttpOnly, SameSite=Strict)
@CurrentEndUser() endUser: EndUser
```

Magic link 15 min → session 7 days. Never mix AuthGuard and EndUserAuthGuard on same controller.

## Data Access

Services inject repositories. Repositories inject `PrismaService`. Always use `select`/`include` to limit fields.

```typescript
// In repository:
constructor(private readonly db: PrismaService) {}
async findByUser(userId: string) {
  return this.db.client.aI.findMany({ where: { userId }, select: { id: true, name: true } });
}
```

## Document Processing

API creates Document (PENDING) → enqueues BullMQ job via `@corpusai/queue` → ai-worker processes async → SSE progress at `/ais/:aiId/documents/:id/progress/stream`.

## Access Control (AIs)

| Mode        | DB Field         | Check                                          |
| ----------- | ---------------- | ---------------------------------------------- |
| OPEN        | —                | Public                                         |
| GATED token | `AI.accessToken` | Direct header `x-access-token` match           |
| GATED code  | `AI.accessCode`  | `bcrypt.compare` header `x-access-code`        |
| MEMBER      | `AI.inviteOnly`  | `AIAccessGrant.ACTIVE` not expired for EndUser |

UnauthorizedException with `{ reason: 'access_token' | 'access_code' | 'invite_only' | 'ai_inactive' }`

## Error Handling

Use NestJS standard exceptions: `NotFoundException`, `ForbiddenException`, `BadRequestException`, `UnauthorizedException`.

## Swagger

All controllers: `@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`. Available at `/docs` (dev only).

## Checklist

- [ ] Swagger decorators on all endpoints
- [ ] DTOs validated with class-validator
- [ ] Ownership verified via OwnershipService
- [ ] No sensitive data exposed (accessToken/accessCode never returned)
- [ ] TypeScript strict, no `any`
- [ ] Subscription limits checked (assertCan\* in shared/subscription-checks.ts)
- [ ] Correct guard: AuthGuard vs EndUserAuthGuard
