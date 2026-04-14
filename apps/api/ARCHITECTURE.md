# API Architecture — Modular Monolith + Hexagonal Light

## Overview

The CorpusAI API is a **NestJS 11** application using a **Modular Monolith** architecture with **Hexagonal Light** principles:

- **Modular Monolith** : 16 feature modules with strict boundaries (barrel exports only), deployed as a single process
- **Hexagonal Light** : Services → Repositories → PrismaService. External dependencies (DB, email, queue) are injected, not imported directly. No DDD entities or Value Objects — pragmatic for a solo-dev SaaS.

```
┌─────────────────────────────────────────────────────────┐
│  HTTP Request                                           │
├─────────────────────────────────────────────────────────┤
│  Controller Layer    (DTOs, Swagger, Guards)            │
│  ↓                                                      │
│  Service Layer       (Business logic, ownership, limits) │
│  ↓                                                      │
│  Repository Layer    (Prisma queries via PrismaService)  │
│  ↓                                                      │
│  Infrastructure      (PrismaService, Redis, BullMQ)      │
└─────────────────────────────────────────────────────────┘
```

---

## Directory Structure

```
src/
├── main.ts                         # Bootstrap: CORS, CSP/HSTS, Swagger, ValidationPipe, Sentry
├── app.module.ts                   # Root module — registers all 16 modules + global config
├── app.controller.ts               # Root health endpoint
│
├── infrastructure/                 # Core infrastructure (injected globally)
│   └── database/
│       ├── prisma.service.ts       # Injectable wrapper around Prisma singleton
│       ├── database.module.ts      # @Global() module — PrismaService available everywhere
│       └── index.ts                # Barrel: PrismaService, DatabaseModule
│
├── common/                         # Cross-cutting HTTP concerns
│   ├── filters/
│   │   └── all-exceptions.filter.ts    # Global exception filter + Sentry capture
│   └── middleware/
│       └── correlation-id.middleware.ts # x-correlation-id propagation for tracing
│
├── lib/                            # App-level configuration
│   ├── auth.ts                     # Better Auth instance (OAuth, 2FA, rate limits, cookies)
│   └── sentry.ts                   # Sentry initialization
│
├── shared/                         # Global business services
│   ├── shared.module.ts            # @Global() module — OwnershipService available everywhere
│   ├── ownership.service.ts        # AI/Document/Conversation ownership verification
│   ├── ownership.repository.ts     # Ownership Prisma queries
│   ├── subscription-checks.ts      # assertCanCreateAI, assertCanAddDocument, etc.
│   ├── daily-stats.ts              # Atomic daily stats increment (transaction-safe)
│   ├── date-utils.ts               # Analytics period helpers
│   └── index.ts                    # Barrel
│
├── modules/                        # 16 feature modules (see below)
│   ├── auth/
│   ├── users/
│   ├── ais/
│   ├── documents/
│   ├── conversations/
│   ├── rag/
│   ├── billing/
│   ├── admin/
│   ├── public-api/
│   ├── explore/
│   ├── mail/
│   ├── end-user-auth/
│   ├── portal/
│   ├── webhooks/
│   └── health/
│
└── test/
    └── mock-prisma.ts              # Shared Prisma mock for unit tests
```

---

## Module Pattern

Every feature module follows the same structure:

```
modules/example/
├── example.module.ts           # @Module declaration — imports, providers, exports
├── example.controller.ts       # HTTP routes + Swagger decorators + Guards
├── example.service.ts          # Business logic — injects repository + other services
├── example.repository.ts       # Data access — injects PrismaService, contains all Prisma queries
├── dto/
│   ├── create-example.dto.ts   # class-validator + @ApiProperty
│   └── update-example.dto.ts
└── index.ts                    # Barrel export — ALL cross-module imports go through this
```

### Rules

1. **Cross-module imports MUST go through barrel** (`index.ts`). Never import `../auth/auth.guard.ts` — import `../auth` instead.
2. **Services never import Prisma directly** — they inject their module's Repository.
3. **Repositories inject PrismaService** — the only layer that touches the DB.
4. **Each module exports only what others need** — typically the Service and Module.

### Data Flow

```
Request → Controller (validate DTO, extract user)
  → Service (business logic, ownership check, subscription check)
    → Repository (Prisma query via PrismaService)
      → PrismaService.client (Prisma singleton)
```

---

## Modules Reference

### Global Modules (@Global — no import needed)

| Module           | Provides           | Purpose                                         |
| ---------------- | ------------------ | ----------------------------------------------- |
| `DatabaseModule` | `PrismaService`    | Prisma client wrapper                           |
| `SharedModule`   | `OwnershipService` | AI/Document/Conversation ownership verification |
| `MailModule`     | `MailService`      | Resend transactional emails                     |
| `WebhooksModule` | `WebhooksService`  | Event emission to creator webhooks              |

### Feature Modules

| Module                  | Imports                           | Exports                                                     | Key Files                                                                          |
| ----------------------- | --------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **AuthModule**          | —                                 | `AuthService`                                               | `auth.guard.ts`, `admin.guard.ts`, `api-key.guard.ts`, `current-user.decorator.ts` |
| **UsersModule**         | —                                 | `UsersService`                                              | Profile, analytics, accounts, usage                                                |
| **AIsModule**           | `RagModule`                       | `AIsService`                                                | CRUD, access control (token/code/invite), analytics, members                       |
| **DocumentsModule**     | `RagModule`, `ConfigModule`       | `DocumentsService`, `DOCUMENT_QUEUE`                        | Upload, processing, SSE progress, retry                                            |
| **ConversationsModule** | `RagModule`, `ConfigModule`       | `ConversationsService`                                      | Chat, streaming SSE, memory, feedback                                              |
| **RagModule**           | —                                 | `RagService`, `TextGenerationService`, `RagPipelineFactory` | Vector search, LLM generation, pipeline factory                                    |
| **BillingModule**       | —                                 | `BillingService`, `StripeService`                           | Stripe checkout, webhooks, invoices                                                |
| **AdminModule**         | `ConfigModule`, `DocumentsModule` | —                                                           | Dashboard stats, user/AI management, system health                                 |
| **PublicApiModule**     | `RagModule`                       | —                                                           | API key management, public RAG queries, rate limiting                              |
| **ExploreModule**       | —                                 | `ExploreService`                                            | Public AI discovery, search, creator profiles                                      |
| **EndUserAuthModule**   | —                                 | `EndUserAuthService`, `EndUserAuthGuard`                    | Magic link auth, session management                                                |
| **PortalModule**        | `EndUserAuthModule`               | `PortalService`                                             | End-user portal (profile, conversations)                                           |
| **HealthModule**        | `TerminusModule`                  | —                                                           | Liveness/readiness probes                                                          |

### Module Dependency Graph

```
                    ┌──────────┐
                    │ RagModule │
                    └────┬─────┘
           ┌─────────────┼─────────────┐
           ▼             ▼             ▼
      ┌─────────┐  ┌──────────┐  ┌───────────┐
      │ AIsModule│  │Documents │  │Conversations│
      └─────────┘  │  Module  │  │   Module    │
                   └──────────┘  └─────────────┘
                         │
                         ▼
                   ┌───────────┐
                   │AdminModule│
                   └───────────┘

      ┌───────────────┐
      │EndUserAuthModule│
      └───────┬───────┘
              ▼
      ┌──────────────┐
      │ PortalModule │
      └──────────────┘

      ┌───────────────┐
      │PublicApiModule │──→ RagModule
      └───────────────┘

Global (available everywhere, no arrows needed):
  DatabaseModule, SharedModule, MailModule, WebhooksModule
```

---

## Authentication Architecture

Two completely independent auth systems — **never mix on the same controller**.

### Creator Auth (Better Auth)

```typescript
@UseGuards(AuthGuard)
@CurrentUser() user: CurrentUserData   // { id, email, name, subscriptionPlan }
```

- Cookie: `better-auth.session_token` (HttpOnly, Secure, SameSite)
- Config: `lib/auth.ts` (OAuth Google/GitHub, 2FA, email verification, rate limits)
- Guard: validates via `auth.api.getSession(fromNodeHeaders(headers))`
- Also checks subscription status — blocks `CANCELED`/`PAST_DUE`

### End-User Auth (Magic Link)

```typescript
@UseGuards(EndUserAuthGuard)
@CurrentEndUser() endUser: EndUser     // { id, email, name, emailVerified }
```

- Cookie: `eu_session` (HttpOnly, SameSite=Strict, 7 days)
- Magic link: 15 min expiry, sent via MailService
- Guard: validates session token + expiry from DB

### API Key Auth

```typescript
@UseGuards(ApiKeyGuard)
// request.apiKeyUserId contains the authenticated user ID
```

- Header: `x-api-key: cai_...`
- Validated via SHA-256 hash lookup in `apiKey` table

### Admin Auth

```typescript
@UseGuards(AdminGuard)  // Extends AuthGuard — checks user.role === 'ADMIN'
```

---

## Dependency Injection Patterns

### 1. Standard Class Injection

Most services use simple class injection:

```typescript
// Repository injects PrismaService (global)
@Injectable()
export class AIsRepository {
  constructor(private readonly db: PrismaService) {}
}

// Service injects Repository + other services
@Injectable()
export class AIsService {
  constructor(
    private readonly repo: AIsRepository,
    private readonly ownership: OwnershipService, // global
    private readonly ragService: RagService
  ) {}
}
```

### 2. Token-Based Factory Injection

For non-class providers (Redis connections, BullMQ queues):

```typescript
// In module providers:
{
  provide: 'DOCUMENT_QUEUE',
  useFactory: (config: ConfigService) => createDocumentQueue(config.get('REDIS_URL')),
  inject: [ConfigService],
}

// In service:
constructor(@Inject('DOCUMENT_QUEUE') private queue: Queue<DocumentProcessingJobData>) {}
```

### 3. Optional Injection

For providers that may not be available:

```typescript
constructor(@Optional() @Inject('RATE_LIMIT_REDIS') private redis: Redis | null) {}
```

### Current DI Tokens

| Token                 | Module    | Type                               | Purpose                                  |
| --------------------- | --------- | ---------------------------------- | ---------------------------------------- |
| `DOCUMENT_QUEUE`      | Documents | `Queue<DocumentProcessingJobData>` | BullMQ queue for document processing     |
| `REDIS_URL`           | Documents | `string`                           | Redis connection string                  |
| `PROGRESS_SUBSCRIBER` | Documents | `Redis`                            | Redis subscriber for progress events     |
| `PROGRESS_EMITTER`    | Documents | `EventEmitter`                     | Node.js EventEmitter for SSE streaming   |
| `RATE_LIMIT_REDIS`    | PublicApi | `Redis \| null`                    | Optional Redis for API key rate limiting |

---

## Document Processing Pipeline

```
┌─────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐
│   API   │    │   Redis   │    │ ai-worker│    │  Qdrant  │
│(NestJS) │    │  (BullMQ) │    │ (BullMQ) │    │ (vectors)│
└────┬────┘    └─────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │              │              │
     │ 1. Create     │              │              │
     │ Document      │              │              │
     │ (PENDING)     │              │              │
     │               │              │              │
     │ 2. Enqueue ──▶│              │              │
     │    job        │ 3. Pick up──▶│              │
     │               │    job       │              │
     │               │              │ 4. Parse     │
     │               │              │ 5. Chunk     │
     │               │              │ 6. Embed ───▶│ 7. Store
     │               │              │              │    vectors
     │               │◀── 8. Publish│              │
     │               │    progress  │              │
     │◀── 9. SSE ────│              │              │
     │    stream      │              │              │
```

1. API creates Document record (status: `PENDING`)
2. Enqueues `DocumentProcessingJobData` to BullMQ
3. ai-worker picks up the job (concurrency: 3)
   4-7. Worker parses, chunks, embeds, stores vectors
4. Worker publishes progress to Redis channels (`DOCUMENT_PROGRESS`, `DOCUMENT_FINAL_FAILURE`)
5. API subscribes via `PROGRESS_SUBSCRIBER`, emits via `PROGRESS_EMITTER`, streams via SSE endpoint

---

## Access Control (AI)

AIs have 4 access modes, checked in `ConversationsService.checkAIAccess()`:

| Mode                | DB Fields        | Verification                                     |
| ------------------- | ---------------- | ------------------------------------------------ |
| **OPEN**            | —                | Public, no check                                 |
| **GATED (token)**   | `AI.accessToken` | `x-access-token` header matches                  |
| **GATED (code)**    | `AI.accessCode`  | `bcrypt.compare(x-access-code, hash)`            |
| **MEMBER (invite)** | `AI.inviteOnly`  | `AIAccessGrant.ACTIVE` + not expired for EndUser |

Access denied returns `UnauthorizedException` with `{ reason: 'access_token' | 'access_code' | 'invite_only' | 'ai_inactive' }`.

---

## Error Handling

### Global Exception Filter (`AllExceptionsFilter`)

- Formats all HTTP exceptions as `{ statusCode, message, path, correlationId, ...custom }`
- Captures 5xx errors to Sentry (with correlation ID, path, method tags)
- Adds `Retry-After: 1` header for 429 responses
- Strips stack traces in production

### Request Tracing

`CorrelationIdMiddleware` generates/propagates `x-correlation-id` across:

- Request headers → Response headers → Pino log context → Sentry tags

### Standard Exceptions

```typescript
throw new NotFoundException('AI not found');
throw new ForbiddenException('Access denied');
throw new BadRequestException('Invalid input');
throw new UnauthorizedException({ reason: 'access_token' });
```

---

## Rate Limiting

### Global (ThrottlerModule)

```
short:  3 requests / 1 second
medium: 20 requests / 10 seconds
long:   100 requests / 60 seconds
```

Applied as `APP_GUARD` — all endpoints are rate-limited by default. Use `@SkipThrottle()` to opt out.

### API Key Rate Limiting

`ApiKeyRateLimitInterceptor` — Redis-backed sliding window (configurable via `API_KEY_RATE_LIMIT` env var, default: 60/min). Gracefully skipped if Redis not configured.

---

## Configuration

Validated at startup via Joi in `ConfigModule.forRoot()`:

| Variable                | Required     | Default       | Purpose                        |
| ----------------------- | ------------ | ------------- | ------------------------------ |
| `DATABASE_URL`          | Yes          | —             | PostgreSQL connection          |
| `BETTER_AUTH_SECRET`    | Yes (min 32) | —             | Session encryption             |
| `BETTER_AUTH_URL`       | Yes          | —             | Auth callback URL              |
| `FRONTEND_URL`          | Yes          | —             | CORS origin + redirects        |
| `OPENAI_API_KEY`        | Yes          | —             | Embeddings + LLM               |
| `QDRANT_URL`            | Yes          | —             | Vector database                |
| `REDIS_URL`             | No           | —             | Queue, cache, rate limiting    |
| `STRIPE_SECRET_KEY`     | No           | —             | Payment processing             |
| `STRIPE_WEBHOOK_SECRET` | No           | —             | Webhook signature verification |
| `SENTRY_DSN`            | No           | —             | Error tracking                 |
| `RESEND_API_KEY`        | No           | —             | Transactional emails           |
| `NODE_ENV`              | No           | `development` | Environment                    |
| `PORT`                  | No           | `3001`        | HTTP port                      |

---

## Testing

- **Framework**: Vitest (ESM support)
- **Strategy**: Unit tests with mocked repositories
- **Pattern**: Services instantiated manually with mock dependencies

```typescript
// Mock repository (delegates to Prisma mocks for assertion compatibility)
const mockRepo = {
  findByUser: vi.fn(() => mockAI.findMany()),
  create: vi.fn(() => mockAI.create()),
};

// Service under test
service = new AIsService(mockRagService, mockTextGen, mockOwnership, mockRepo);
```

- **Coverage excluded**: DTOs, index.ts, main.ts
- **Test count**: 140 tests across 14 files

---

## Future Architecture (Phases 2-4)

### Phase 2 — LLM Provider Port

```
infrastructure/llm/
├── llm.port.ts         # Interface LLMService + Symbol token
├── openai.adapter.ts   # Current OpenAI implementation
└── llm.module.ts       # @Global, useClass: OpenAILLMAdapter
```

### Phase 3 — Remaining Ports

```
infrastructure/mail/    # IMailService port (Resend adapter)
infrastructure/queue/   # IDocumentQueue port (BullMQ adapter)
infrastructure/redis/   # IRateLimiter + IEventBus ports
```

### Phase 4 — ESLint Enforcement

`@typescript-eslint/no-restricted-imports` rule to prevent cross-module barrel bypass.
