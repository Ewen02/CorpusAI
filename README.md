# CorpusAI

> RAG-as-a-service for creators and small teams. Upload your docs, create an
> AI assistant, embed the chat anywhere or share it as a public link. Bring
> your own access control, branding and pricing.

```
┌────────────────┐    ┌───────────────────┐    ┌─────────────────┐
│  Next.js web   │───▶│   NestJS API      │───▶│   PostgreSQL    │
│  (creators +   │    │   - REST + SSE    │    │   (Prisma)      │
│   widget +     │    │   - Better Auth   │    └─────────────────┘
│   portal)      │    │   - BullMQ enq.   │    ┌─────────────────┐
└────────────────┘    │   - Stripe        │───▶│  Qdrant         │
        │              └─────────┬─────────┘    │  (vectors)      │
        │                        │              └─────────────────┘
        │                        ▼              ┌─────────────────┐
        │              ┌───────────────────┐    │  Redis          │
        │              │  AI Worker        │◀──▶│  - BullMQ queue │
        └──────────────│  - parse PDF/DOCX │    │  - rate limit   │
            embed JS   │  - chunk + embed  │    │  - emb. cache   │
                       │  - upsert Qdrant  │    └─────────────────┘
                       └───────────────────┘
                                │
                                ▼
                       ┌───────────────────┐
                       │  OpenAI / Anthr.  │
                       │  / Groq (LLM)     │
                       └───────────────────┘
```

## Stack

- **`apps/web`** — Next.js 15 (App Router, React 19, Tailwind, next-intl)
- **`apps/api`** — NestJS 11 (hexagonal), Prisma 6, Better Auth, BullMQ, Stripe
- **`apps/ai-worker`** — BullMQ worker, parses uploads and indexes chunks
- **`packages/corpus`** — RAG pipeline (chunking, embedding, hybrid search, reranking)
- **`packages/database`** — Prisma schema + soft-delete extension
- **`packages/email`** — React-friendly transactional templates (Resend)
- **`packages/sdk`** — Public TypeScript SDK for the `/v1/*` API
- **`packages/ui`** — Atomic design components (atoms / molecules / organisms / templates)

Detailed per-package notes live in each `CLAUDE.md`.

## Prerequisites

- Node ≥ 20
- pnpm ≥ 9
- Docker (for the Postgres + Redis + Qdrant compose stack)
- An OpenAI API key (embeddings + default generation provider)

Optional: Anthropic / Groq keys (multi-provider LLM), Stripe, Resend, Sentry,
Google / GitHub OAuth.

## Quick start

```bash
# 1. Install deps
pnpm install

# 2. Boot Postgres + Redis + Qdrant
docker compose up -d

# 3. Push the schema
pnpm db:push

# 4. Copy env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env

# 5. Run everything
pnpm dev
#  - web    http://localhost:3000
#  - api    http://localhost:3001
#  - swagger http://localhost:3001/docs
#  - worker logs in the same terminal
```

## Common commands

```bash
pnpm dev              # turbo dev on all apps
pnpm build            # turbo build (uses remote cache if TURBO_TOKEN set)
pnpm typecheck        # tsc --noEmit on every workspace
pnpm test             # vitest on every workspace
pnpm test:e2e         # playwright (web + api must be running)
pnpm lint             # eslint --fix on changed files

# Database
pnpm db:studio        # Prisma Studio
pnpm db:migrate dev   # create + apply a dev migration
pnpm db:generate      # regenerate Prisma client

# Worker only
pnpm worker:dev       # ai-worker in watch mode
```

## Architecture rules

- **API**: hexagonal (controller → service → repository → PrismaService).
  No direct `prisma` import outside `packages/database` and the legacy auth
  bootstrap. Repositories always use explicit `select` so secrets
  (`accessToken`, `accessCode`, `keyHash`, `sessionToken`, webhook secret)
  never leak into responses.
- **Cross-module imports**: barrel exports only. `import { FooService } from '../foo'`
  is fine; `import { FooService } from '../foo/foo.service'` is rejected by
  ESLint.
- **Soft-delete**: `User` and `AI` use the extension in
  [packages/database/src/client.ts](packages/database/src/client.ts).
  `findMany`/`findFirst`/`count` filter `deletedAt: null` automatically.
- **Tests**: 290+ unit tests (vitest) + 44 e2e (Playwright). Don't merge a
  feature without at least one test per public path.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for the Railway-based default deployment.

Topical guides:

- [Self-hosted Qdrant](docs/qdrant-self-hosted.md) — when 1 GB Cloud is not enough
- [Prisma migrations playbook](docs/prisma-migrations.md) — forward-only workflow
- [Turbo remote cache](docs/turbo-remote-cache.md) — Vercel or self-hosted
- [Docker base image ADR](docs/docker-base-image-adr.md) — slim vs alpine
- [SSO design](docs/sso-saml.md) — SAML via WorkOS, rollout plan

## Repository layout

```
corpusai/
├── apps/
│   ├── api/              # NestJS REST API + Swagger
│   ├── web/              # Next.js dashboard + portal + widget + embed
│   └── ai-worker/        # BullMQ worker
├── packages/
│   ├── ai-rules/         # System prompts, confidence scoring
│   ├── corpus/           # RAG pipeline (chunking, vectors, rerank)
│   ├── database/         # Prisma schema + soft-delete extension
│   ├── email/            # Transactional templates
│   ├── queue/            # BullMQ queue + DLQ helpers
│   ├── sdk/              # Public @corpusai/sdk
│   ├── subscription/     # Plan limits + helpers
│   ├── types/            # Shared TypeScript types
│   └── ui/               # Atomic design components + tokens
├── e2e/                  # Playwright specs
├── docs/                 # Topical guides + ADRs
└── tooling/              # eslint-config, typescript-config
```

## Contributing

Conventional commits (`feat`, `fix`, `refactor`, `perf`, `test`, `docs`,
`chore`) with explicit scope: `feat(api): …`, `fix(web): …`. One PR ⇒ one
scope ⇒ one Prisma migration if applicable.

For per-app conventions read the `CLAUDE.md` in the workspace you're editing.

## License

Private. All rights reserved.
