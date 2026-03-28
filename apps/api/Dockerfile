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
RUN pnpm --filter @corpusai/database db:generate
RUN pnpm --filter @corpusai/api... build
RUN pnpm --filter @corpusai/api deploy --prod /app/deploy
# Copy generated Prisma client into deployed node_modules
RUN cp -r $(find /app/node_modules/.pnpm -path '*/@prisma/client' -type d | head -1)/../../.prisma /app/deploy/node_modules/.prisma

# ── Runtime ───────────────────────────────────────────────────
FROM node:20-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends curl openssl && rm -rf /var/lib/apt/lists/*
RUN npm install -g prisma@6
WORKDIR /app

COPY --from=build /app/deploy/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/packages/database/prisma ./prisma

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

CMD ["sh", "-c", "prisma migrate deploy --schema ./prisma/schema.prisma && node dist/main.js"]
