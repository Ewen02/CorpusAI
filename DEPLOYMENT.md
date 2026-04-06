# CorpusAI - Railway Deployment Guide

## Architecture

```
Railway Project
├── PostgreSQL          (Railway plugin)
├── Redis               (Railway plugin)
├── api                 (apps/api/Dockerfile)
├── web                 (apps/web/Dockerfile)
├── worker              (apps/ai-worker/Dockerfile)
└── Qdrant              (external — Qdrant Cloud)
```

## Prerequisites

- Railway account (https://railway.app)
- Qdrant Cloud account (https://cloud.qdrant.io) — free tier = 1GB
- Stripe account with live keys
- OpenAI API key
- Resend account with verified domain
- (Optional) Google & GitHub OAuth app credentials
- (Optional) Sentry project DSN
- (Optional) S3-compatible storage (Cloudflare R2, AWS S3)

## Step 1: Create Railway Project

1. Go to https://railway.app/new
2. Create a new empty project named `CorpusAI`

## Step 2: Add Database Services

### PostgreSQL

1. Click **+ New** → **Database** → **PostgreSQL**
2. Note the `DATABASE_URL` from the **Variables** tab (format: `postgresql://...`)

### Redis

1. Click **+ New** → **Database** → **Redis**
2. Note the `REDIS_URL` from the **Variables** tab

## Step 3: Create Qdrant Cloud Cluster

1. Go to https://cloud.qdrant.io
2. Create a free cluster (1GB storage)
3. Note the **URL** (e.g., `https://xxx.europe-west3-0.gcp.cloud.qdrant.io:6333`)
4. Create an **API key** from the cluster dashboard

## Step 4: Deploy Application Services

### Connect GitHub Repository

1. In Railway, click **+ New** → **GitHub Repo**
2. Connect your CorpusAI repository
3. You will create 3 services from the same repo, each with a different root directory

### Service: `api`

1. Click **+ New** → **GitHub Repo** → select CorpusAI
2. Go to **Settings**:
   - **Root Directory**: `/` (monorepo root — Dockerfile uses context from root)
   - **Builder**: Dockerfile
   - **Dockerfile Path**: `apps/api/Dockerfile`
   - **Watch Paths**: `apps/api/**`, `packages/**`
3. The service will auto-detect `apps/api/railway.toml`

### Service: `web`

1. Click **+ New** → **GitHub Repo** → select CorpusAI
2. Go to **Settings**:
   - **Root Directory**: `/`
   - **Builder**: Dockerfile
   - **Dockerfile Path**: `apps/web/Dockerfile`
   - **Watch Paths**: `apps/web/**`, `packages/ui/**`, `packages/types/**`
3. **Important**: Add build arg `NEXT_PUBLIC_API_URL` pointing to the API service URL

### Service: `worker`

1. Click **+ New** → **GitHub Repo** → select CorpusAI
2. Go to **Settings**:
   - **Root Directory**: `/`
   - **Builder**: Dockerfile
   - **Dockerfile Path**: `apps/ai-worker/Dockerfile`
   - **Watch Paths**: `apps/ai-worker/**`, `packages/**`
3. **No public domain needed** — this is an internal worker

## Step 5: Configure Environment Variables

### Service: `api`

| Variable                          | Value                         | Notes                      |
| --------------------------------- | ----------------------------- | -------------------------- |
| `DATABASE_URL`                    | `${{Postgres.DATABASE_URL}}`  | Railway reference variable |
| `REDIS_URL`                       | `${{Redis.REDIS_URL}}`        | Railway reference variable |
| `QDRANT_URL`                      | `https://xxx.qdrant.io:6333`  | From Qdrant Cloud          |
| `QDRANT_API_KEY`                  | `(your key)`                  | From Qdrant Cloud          |
| `NODE_ENV`                        | `production`                  |                            |
| `BETTER_AUTH_SECRET`              | `(generate 64+ random chars)` | `openssl rand -hex 32`     |
| `BETTER_AUTH_URL`                 | `https://api.yourdomain.com`  | API public URL             |
| `FRONTEND_URL`                    | `https://app.yourdomain.com`  | Web public URL (for CORS)  |
| `OPENAI_API_KEY`                  | `sk-...`                      | For embeddings & LLM       |
| `STRIPE_SECRET_KEY`               | `sk_live_...`                 | Stripe live key            |
| `STRIPE_WEBHOOK_SECRET`           | `whsec_...`                   | Set after step 7           |
| `STRIPE_PRICE_CREATOR_MONTHLY`    | `price_...`                   | Stripe price ID            |
| `STRIPE_PRICE_CREATOR_YEARLY`     | `price_...`                   | Stripe price ID            |
| `STRIPE_PRICE_PRO_MONTHLY`        | `price_...`                   | Stripe price ID            |
| `STRIPE_PRICE_PRO_YEARLY`         | `price_...`                   | Stripe price ID            |
| `STRIPE_PRICE_ENTERPRISE_MONTHLY` | `price_...`                   | Stripe price ID            |
| `STRIPE_PRICE_ENTERPRISE_YEARLY`  | `price_...`                   | Stripe price ID            |
| `RESEND_API_KEY`                  | `re_...`                      | For magic link emails      |
| `RESEND_FROM_EMAIL`               | `noreply@yourdomain.com`      | Verified sender            |
| `SENTRY_DSN`                      | `https://...@sentry.io/...`   | Optional                   |
| `GOOGLE_CLIENT_ID`                | `(optional)`                  | OAuth                      |
| `GOOGLE_CLIENT_SECRET`            | `(optional)`                  | OAuth                      |
| `GITHUB_CLIENT_ID`                | `(optional)`                  | OAuth                      |
| `GITHUB_CLIENT_SECRET`            | `(optional)`                  | OAuth                      |
| `S3_BUCKET`                       | `(optional)`                  | Document storage           |
| `S3_REGION`                       | `(optional)`                  |                            |
| `S3_ACCESS_KEY`                   | `(optional)`                  |                            |
| `S3_SECRET_KEY`                   | `(optional)`                  |                            |
| `S3_ENDPOINT`                     | `(optional)`                  |                            |

### Service: `web`

| Variable              | Value                        | Notes                            |
| --------------------- | ---------------------------- | -------------------------------- |
| `NODE_ENV`            | `production`                 |                                  |
| `NEXT_PUBLIC_API_URL` | `https://api.yourdomain.com` | Must be set as **build arg** too |
| `SENTRY_DSN`          | `(optional)`                 |                                  |
| `SENTRY_AUTH_TOKEN`   | `(optional)`                 | For source maps upload           |

### Service: `worker`

| Variable         | Value                        | Notes                      |
| ---------------- | ---------------------------- | -------------------------- |
| `DATABASE_URL`   | `${{Postgres.DATABASE_URL}}` | Railway reference variable |
| `REDIS_URL`      | `${{Redis.REDIS_URL}}`       | Railway reference variable |
| `QDRANT_URL`     | `https://xxx.qdrant.io:6333` | Same as API                |
| `QDRANT_API_KEY` | `(your key)`                 | Same as API                |
| `NODE_ENV`       | `production`                 |                            |
| `OPENAI_API_KEY` | `sk-...`                     | Same as API                |
| `SENTRY_DSN`     | `(optional)`                 | Same as API                |

> **Tip**: Use Railway's **Shared Variables** feature to avoid duplicating keys across services.

## Step 6: Configure Custom Domains

1. In Railway, go to each service's **Settings** → **Networking** → **Public Networking**
2. Generate a Railway domain or add a custom domain:
   - `api`: `api.yourdomain.com`
   - `web`: `app.yourdomain.com` (or `yourdomain.com`)
3. Add the DNS records (CNAME) in your domain registrar
4. Update `BETTER_AUTH_URL` and `FRONTEND_URL` to match the final URLs
5. Rebuild the `web` service after updating `NEXT_PUBLIC_API_URL`

## Step 7: Configure Stripe Webhook

1. Go to https://dashboard.stripe.com/webhooks
2. Click **Add endpoint**
3. URL: `https://api.yourdomain.com/billing/webhooks/stripe`
4. Events to listen for:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
5. Copy the **Signing secret** (`whsec_...`)
6. Set `STRIPE_WEBHOOK_SECRET` in the API service variables

## Step 8: Configure Resend (Email)

1. Go to https://resend.com/domains
2. Add and verify your domain (add DNS records: SPF, DKIM, DMARC)
3. Set `RESEND_FROM_EMAIL` to `noreply@yourdomain.com`

## Step 9: Verify Deployment

### Health checks

```bash
# API liveness
curl https://api.yourdomain.com/health
# Expected: { "status": "ok" }

# API readiness (DB + Redis connected)
curl https://api.yourdomain.com/health/ready
# Expected: { "status": "ok", "info": { "database": { "status": "up" }, "redis": { "status": "up" } } }
```

### Functional checks

1. Open `https://app.yourdomain.com` — landing page loads
2. Sign up with email/password — account created
3. Create an AI assistant — wizard works
4. Upload a PDF document — processing completes (check worker logs)
5. Ask a question in chat — RAG response with sources
6. Test the embed widget — `/embed/@username/slug` loads
7. Test Stripe checkout — upgrade to a paid plan
8. Test magic link — end-user receives email and can log in

### Monitoring

- Check Railway logs for each service (dashboard → service → **Logs**)
- Check Sentry for any errors (https://sentry.io)

## Troubleshooting

### Database migrations fail

Check API service logs. The `prisma migrate deploy` runs before the app starts.
If it fails, ensure `DATABASE_URL` is correct and the PostgreSQL service is healthy.

### Web shows "Failed to fetch" errors

- Verify `NEXT_PUBLIC_API_URL` is correct and the API is reachable
- Verify `FRONTEND_URL` in the API matches the web URL (CORS)
- Rebuild the web service after changing `NEXT_PUBLIC_API_URL` (it's a build-time var)

### Worker not processing documents

- Check worker logs in Railway
- Verify `REDIS_URL` is correct (worker connects to the same Redis as API)
- Verify `OPENAI_API_KEY` and `QDRANT_URL` are set

### Stripe webhooks not received

- Verify the webhook endpoint URL: `https://api.yourdomain.com/billing/webhooks/stripe`
- Check the webhook signing secret matches `STRIPE_WEBHOOK_SECRET`
- Check Stripe dashboard → Webhooks → event delivery logs

### Magic link emails not sent

- Verify Resend domain is verified (SPF + DKIM + DMARC)
- Check `RESEND_API_KEY` and `RESEND_FROM_EMAIL` are set in the API service
- Check API logs for email sending errors
