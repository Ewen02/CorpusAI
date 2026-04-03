---
name: devops-docker
description: Gère Docker, CI/CD et infrastructure du monorepo CorpusAI. Triggers : "Docker", "Dockerfile", "docker-compose", "CI/CD", "GitHub Actions", "deploy", "healthcheck", "build prod".
---

Stack : Docker multi-stage, pnpm deploy, Turborepo, GitHub Actions.

## Architecture Docker

```
Dockerfile.api        # NestJS API — port 3001
Dockerfile.web        # Next.js — port 3000
Dockerfile.ai-worker  # BullMQ worker — no port
docker-compose.yml    # Dev local (API + Web + Worker + Postgres + Redis + Qdrant)
```

## Pattern multi-stage (toutes les images)

```dockerfile
# 1. base    — pnpm + node
# 2. deps    — pnpm install --frozen-lockfile
# 3. build   — pnpm --filter <app> build + pnpm deploy --filter <app>
# 4. runner  — node:slim, copier le deploy output, HEALTHCHECK
```

## Règles critiques

- TOUJOURS `--frozen-lockfile` dans les Dockerfiles
- JAMAIS copier .env dans l'image — injecter via env vars runtime
- HEALTHCHECK obligatoire sur API et Web
- Prisma : `npx prisma generate` dans le build, `npx prisma migrate deploy` à l'entrypoint
- Layer caching : copier package.json/pnpm-lock AVANT le code source

## GitHub Actions (CI)

```yaml
# .github/workflows/ci.yml
jobs:
  lint-typecheck: pnpm lint && pnpm typecheck
  test-corpus: pnpm --filter @corpusai/corpus test
  test-api: pnpm --filter @corpusai/api test
  build: pnpm build (avec Turborepo remote cache)
```

## Checklist

- [ ] Images < 500MB (vérifier avec `docker images`)
- [ ] Healthchecks sur API (/health) et Web
- [ ] .dockerignore exclut node_modules, .env, .git
- [ ] Pas de secrets dans les layers Docker
- [ ] CI : --frozen-lockfile + cache Turborepo
