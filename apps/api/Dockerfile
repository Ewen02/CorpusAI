FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/types/package.json ./packages/types/
COPY packages/database/package.json ./packages/database/
COPY packages/corpus/package.json ./packages/corpus/
COPY packages/ai-rules/package.json ./packages/ai-rules/
COPY packages/subscription/package.json ./packages/subscription/
COPY packages/queue/package.json ./packages/queue/
COPY tooling/typescript-config/package.json ./tooling/typescript-config/
RUN pnpm install --frozen-lockfile

# ── Build ─────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/ ./
COPY . .
RUN pnpm --filter @corpusai/database exec prisma generate
RUN pnpm --filter @corpusai/api... build
RUN pnpm --filter @corpusai/api deploy --prod --config.node-linker=hoisted /app/deploy
# Generate Prisma client inside the deploy dir using the schema shipped with @corpusai/database
RUN /app/packages/database/node_modules/.bin/prisma generate \
    --schema=/app/deploy/node_modules/@corpusai/database/prisma/schema.prisma

# ── Runtime ───────────────────────────────────────────────────
FROM node:20-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g prisma@6.19.1
WORKDIR /app

COPY --from=build /app/deploy ./
COPY apps/api/docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
