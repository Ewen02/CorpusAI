# Turbo remote cache

`turbo.json` declares `remoteCache.enabled: true`. With no token, Turbo runs
purely local — no behaviour change. Once `TURBO_TOKEN` + `TURBO_TEAM` are
provided in CI (and optionally in dev), Turbo uploads/downloads task
artifacts from the remote backend so cold-cache builds stay cheap.

## Provider options

| Provider                                                       | When it fits                                 | Cost                    |
| -------------------------------------------------------------- | -------------------------------------------- | ----------------------- |
| **Vercel Remote Cache**                                        | Already on Vercel; no infra to run           | Free up to ~100 GB/mo   |
| **`turborepo-remote-cache`** self-hosted on Cloudflare R2 / S3 | Full control, multi-region                   | Hosting + R2/S3 storage |
| **GitHub Actions cache only**                                  | Stick with the existing `actions/cache` flow | Free, 10 GB cache       |

Recommended: **Vercel** while the team is small (zero ops), self-host if cost
ramps or compliance requires data residency.

## CI wiring (Vercel option)

1. Sign in to https://vercel.com, create or link an account.
2. Go to **Account Settings → Tokens** and create a token scoped to "Remote
   Cache".
3. Identify the team slug (`vercel teams ls` if the CLI is installed).
4. In the repo's GitHub Actions settings, add two secrets:
   - `TURBO_TOKEN` — the token from step 2.
   - `TURBO_TEAM` — the team slug.
5. CI is already wired (`.github/workflows/ci.yml` reads both env vars), so no
   workflow changes are needed. Trigger a run; the `> Remote caching enabled`
   line should appear in each Turbo log.

## Dev wiring (optional)

```bash
# One-off
TURBO_TOKEN=… TURBO_TEAM=corpusai pnpm build

# Or persistent
pnpm dlx turbo login
pnpm dlx turbo link
```

After `turbo link` the credentials live in `~/.turbo/config.json` (gitignored).

## Self-hosted (if Vercel is not an option)

1. Deploy `turborepo-remote-cache` on Cloudflare Workers (free tier covers
   the project today):
   ```bash
   npm i -g create-cloudflare
   pnpm dlx create-cloudflare --template ducktors/turborepo-remote-cache cache
   ```
2. Configure the storage provider:
   - **Cloudflare R2** — free for the first 10 GB/mo of egress.
   - **AWS S3** — cheaper at scale, more ops overhead.
3. Set `TURBO_API` to the Worker URL on top of the existing token/team vars:
   ```yaml
   env:
     TURBO_API: ${{ secrets.TURBO_API }}
     TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
     TURBO_TEAM: ${{ vars.TURBO_TEAM }}
   ```
4. Same workflow files; just a different cache backend.

## What the cache buys us

- **CI cold cache (PR from a feature branch)**: full build ≈ 3 minutes.
  With remote cache and an unchanged dependency graph, only the touched
  package rebuilds — usually < 30 s.
- **Dev `pnpm build` after a `git checkout`**: same story — Turbo restores
  the prior worktree's artifacts instead of recompiling.
- **Cost cap**: tasks that read but don't write (typecheck, lint) cost
  nothing on Vercel; only build outputs count toward the storage quota.

## Cache scope and invalidation

- Task inputs are hashed (see `inputs` arrays in `turbo.json`). The cache
  key includes the hash, the task name, and the resolved version of every
  upstream dependency.
- Outputs are `.next/**` (excluding `.next/cache`) and `dist/**`. Anything
  outside those paths is not restored from cache.
- To force a rebuild without changing inputs (e.g. when a base image changes
  but our code didn't), bump `concurrency` or pass `--force`.
