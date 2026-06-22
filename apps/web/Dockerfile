FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────
# Copy every workspace manifest so `--frozen-lockfile` can validate the
# lockfile against the whole workspace (pnpm needs all package.json files,
# not just web's), then install only the web subgraph.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/api/package.json ./apps/api/
COPY apps/ai-worker/package.json ./apps/ai-worker/
COPY packages/ai-rules/package.json ./packages/ai-rules/
COPY packages/corpus/package.json ./packages/corpus/
COPY packages/database/package.json ./packages/database/
COPY packages/email/package.json ./packages/email/
COPY packages/queue/package.json ./packages/queue/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/subscription/package.json ./packages/subscription/
COPY packages/types/package.json ./packages/types/
COPY packages/ui/package.json ./packages/ui/
COPY tooling/eslint-config/package.json ./tooling/eslint-config/
COPY tooling/typescript-config/package.json ./tooling/typescript-config/
RUN pnpm install --frozen-lockfile --filter @corpusai/web...

# ── Build ─────────────────────────────────────────────────────
FROM base AS build
ARG NEXT_PUBLIC_API_URL=http://localhost:3001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY --from=deps /app/ ./
COPY . .
RUN pnpm --filter @corpusai/web... build

# ── Runtime ───────────────────────────────────────────────────
FROM node:20-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public

ENV NODE_ENV=production
# Bind to all interfaces (not localhost) so Railway's proxy can reach the
# server; PORT is injected by Railway at runtime, default 3000 locally.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/ || exit 1

USER node
CMD ["node", "apps/web/server.js"]
