Run a comprehensive code quality audit on the CorpusAI project.

If a specific domain is given as argument ($ARGUMENTS), audit only that domain. Valid domains: `frontend`, `backend`, `database`, `rag`, `typescript`, `security`, `devops`, `redis`. If no argument is given, audit all 8 domains.

Steps:

1. Launch up to 3 Explore agents in parallel to scan the codebase for the relevant domain(s)
2. Evaluate each checkpoint below with a verdict: PASS, WARN, or FAIL
3. For each WARN/FAIL, note the specific file(s) and line(s) causing the issue
4. Output a structured report (format below)
5. End with a prioritized action plan

---

## Domain 1: Next.js / React Frontend (`frontend`)

Scan `apps/web/src/` and `packages/ui/src/`.

Checkpoints:
- Are non-interactive components Server Components (no unnecessary `"use client"`)?
- Is `next/dynamic` or `React.lazy` used for heavy client-only libraries?
- Are all images served via `next/image` with AVIF/WebP, explicit dimensions, and `priority` on LCP images?
- Is `next/font` used with `subsets: ['latin']` and `display: 'swap'`?
- Are independent data-fetching operations wrapped in `<Suspense>` boundaries?
- Is the bundle free of unexpectedly large client-shipped dependencies?
- Are `generateMetadata` exports present on public pages (OG tags, canonical URLs)?
- Is ISR/`revalidate` used for semi-static content and `generateStaticParams` for static pages?
- Are forms and interactive elements accessible (aria, keyboard, focus, contrast)?
- Are React Query hooks using proper `staleTime`/`gcTime` and optimistic UI for mutations?
- Are third-party scripts loaded via `next/script` with lazy strategies?
- Is `<Link prefetch>` used strategically, not globally?

## Domain 2: NestJS Backend (`backend`)

Scan `apps/api/src/`.

Checkpoints:
- Does every module follow single-responsibility (one domain per module)?
- Is `ValidationPipe` global with `whitelist: true` and `forbidNonWhitelisted: true`?
- Is there a global `ExceptionFilter` that never leaks stack traces?
- Are Guards on every route + ownership verified at service level (not just controller)?
- Are Swagger decorators (`@ApiOperation`, `@ApiResponse`) on every endpoint?
- Is rate limiting applied globally + stricter on sensitive endpoints?
- Are Interceptors used for cross-cutting concerns (no logic duplication)?
- Is `ConfigModule` used with env var validation (fail fast on missing config)?
- Are multi-step writes wrapped in `$transaction`?
- Is health checking implemented (`@nestjs/terminus`)?
- Are all async operations properly awaited (no fire-and-forget)?
- Is logging structured (JSON) with correlation IDs?

## Domain 3: Prisma / PostgreSQL (`database`)

Scan `packages/database/prisma/schema.prisma` and all `.service.ts` files using Prisma.

Checkpoints:
- Are all queries using `select` to limit returned fields?
- Are `include` statements reviewed for N+1 problems?
- Are `@@index` defined for columns in WHERE/ORDER BY/FK?
- Is there a single global `PrismaClient` singleton with proper connection pool?
- Are bulk operations used instead of single-record loops?
- Is cursor-based pagination used for large datasets (not offset at high values)?
- Are `$queryRaw` calls using tagged template literals (no string concatenation)?
- Are migrations used for production (never `db push`)?
- Are composite indexes defined for multi-column filter/sort queries?
- Is connection pooling configured for production?

## Domain 4: AI / RAG Engineering (`rag`)

Scan `packages/corpus/src/`, `packages/ai-rules/src/`, `apps/ai-worker/src/`, and `apps/api/src/modules/rag/`.

Checkpoints:
- Is chunking semantic (respecting document structure) not naive fixed-char?
- Are chunk sizes 400-1000 tokens with overlap 50-100?
- Are embeddings batched (max 100/call) with retry + exponential backoff?
- Is hybrid search implemented (dense + BM25/keyword)?
- Is reranking applied after initial retrieval?
- Are embeddings cached (Redis) to avoid redundant API calls?
- Is the system prompt explicit about citing sources, admitting uncertainty, staying in-context?
- Is token usage tracked per request/user with plan-based limits enforced?
- Is streaming used for LLM responses?
- Is there a confidence threshold below which the system avoids hallucinating?
- Are metadata filters applied during vector search (document ID, user)?
- Are document processing jobs idempotent (safe to retry)?
- Is there an evaluation framework (RAGAS or custom metrics)?

## Domain 5: TypeScript (`typescript`)

Scan all `tsconfig.json` files and source code across the monorepo.

Checkpoints:
- Is `strict: true` enabled in all tsconfig files?
- Are there zero `any` usages (or each justified with a comment)?
- Are return types explicitly annotated on public functions?
- Are discriminated unions used for state modeling (not optional fields)?
- Are utility types (Pick, Omit, Partial) used instead of duplicating types?
- Are type guards preferred over `as` assertions?
- Are generic constraints used on reusable functions?
- Is `satisfies` used where appropriate?
- Are `as const` objects preferred over `enum`?
- Are all shared types in `@corpusai/types` (no duplication across apps)?
- Is `noUncheckedIndexedAccess` enabled?

## Domain 6: Security / OWASP (`security`)

Scan the entire codebase for security patterns.

Checkpoints:
- [A01] Is every API endpoint protected by auth guard + ownership at service level?
- [A01] Are CORS origins explicitly whitelisted (not `*`)? Cookies `HttpOnly`, `Secure`, `SameSite`?
- [A02] Are debug endpoints, stack traces, verbose errors disabled in production?
- [A02] Are HTTP security headers set (CSP, HSTS, X-Frame-Options, X-Content-Type-Options)?
- [A03] Is `pnpm audit` clean? Is `pnpm-lock.yaml` committed?
- [A04] Are all secrets in env vars (never hardcoded or committed)?
- [A04] Are passwords hashed with bcrypt/argon2 (not MD5/SHA)?
- [A05] Are all DB queries parameterized (no string-concatenated SQL)?
- [A05] Is user content sanitized before rendering (XSS prevention)?
- [A07] Is brute-force protection on login (rate limit, lockout)?
- [A09] Are auth events and access control failures logged?
- [A10] Do error handlers fail closed (deny by default)?
- [A10] Is there graceful degradation when Redis/AI APIs are down?

## Domain 7: Monorepo / DevOps (`devops`)

Scan root config files, `turbo.json`, `package.json`, CI/CD, Docker.

Checkpoints:
- Are internal deps using `workspace:*` protocol?
- Is Turborepo `dependsOn` configured correctly in `turbo.json`?
- Is remote caching enabled for CI?
- Is `--frozen-lockfile` enforced in CI with pnpm store cached?
- Are Docker builds multi-stage with layer caching?
- Is `pnpm --filter` used for targeted builds in CI?
- Are `exports` fields in shared package.json files?
- Is there a shared `tsconfig.base.json` extended by all packages?
- Are `.env` files excluded from Docker images?
- Are pre-commit hooks configured (husky + lint-staged)?
- Is there a versioning/release pipeline (Changesets)?

## Domain 8: Redis (`redis`)

Scan all files using `ioredis` or Redis patterns.

Checkpoints:
- Is there a shared Redis client (not new connection per request)?
- Does every cache key have an explicit TTL?
- Is Cache-Aside pattern implemented correctly?
- Are cache keys namespaced with consistent prefixes?
- Is cache invalidated on write operations?
- Is there a fallback when Redis is unavailable?
- Are large objects (> 1MB) avoided in Redis?
- Is Pub/Sub used for real-time (not database polling)?
- Are Redis clients properly disconnected on shutdown?
- Is Redis auth + TLS configured for production?

---

## Report Format

Output the report in this exact structure:

```
# Audit CorpusAI — YYYY-MM-DD

## Score: X/Y checks passed | W warnings | F failures

### FAIL (Critical — fix immediately)
- [DOMAIN] Description — `file:line`

### WARN (Should fix before production)
- [DOMAIN] Description — `file:line`

### PASS (X checks)
- [DOMAIN] Summary of passing checks

### Action Plan (prioritized)
1. (Critical) ...
2. (High) ...
3. (Medium) ...
4. (Low) ...
```
