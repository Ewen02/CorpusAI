FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/ai-worker/package.json ./apps/ai-worker/
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
RUN pnpm --filter @corpusai/ai-worker... build
RUN pnpm --filter @corpusai/ai-worker deploy --prod /app/deploy

# ── Runtime ───────────────────────────────────────────────────
FROM node:20-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY --from=build /app/deploy/node_modules ./node_modules
COPY --from=build /app/apps/ai-worker/dist ./dist
# Copy generated Prisma client (query engine + generated types)
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "process.exit(0)" || exit 1

CMD ["node", "dist/index.js"]
