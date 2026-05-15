# ADR — Docker base image: `node:20-slim` vs `node:20-alpine`

## Status

**Accepted (slim, for now).** Revisit when CI cold-cache builds become a
bottleneck or registry costs grow.

## Context

The three Dockerfiles (`apps/api`, `apps/web`, `apps/ai-worker`) all use
`node:20-slim` as the base for both `deps`, `build`, and `runtime` stages.

Alpine images are smaller and patch faster, which would lower:

- registry storage and pull bandwidth (Railway, GHCR);
- container cold-start latency (~250 ms vs ~400 ms on slim);
- attack surface (musl + busybox have smaller CVE footprints than glibc + GNU
  coreutils).

Counter-balancing arguments:

- **Prisma**: Prisma's official engines target glibc by default. Alpine needs
  the explicit `linux-musl-arm64-openssl-3.0.x` engine or
  `linux-musl-openssl-3.0.x` binary target declared in the Prisma schema.
- **Native deps**: `sharp` (Next.js image optimisation), `bcrypt`, and some
  document-parsing libraries ship glibc-only prebuilt binaries; alpine has to
  rebuild them from source at install time.
- **Debugging**: `node:20-slim` still gives you `bash`, `apt`, and
  `procps` for ad-hoc inspection; alpine forces `ash` + `apk`.

## Decision

Stay on `node:20-slim` until at least one of these triggers fires:

1. Docker image size > 500 MB pulled (currently ~250 MB for api).
2. Registry cost > $20/month for image storage.
3. CI cache-miss build time > 8 minutes (currently ~3 min).

When migrating:

1. Test on `apps/web` first (no native deps beyond `sharp`).
2. Pin `sharp` to a version that ships musl binaries (≥ 0.33).
3. For `apps/api` and `apps/ai-worker`, add the Prisma binary targets in
   `packages/database/prisma/schema.prisma`:
   ```prisma
   generator client {
     provider      = "prisma-client-js"
     binaryTargets = ["native", "linux-musl-openssl-3.0.x"]
   }
   ```
4. Replace `apt-get install` lines with `apk add --no-cache`:
   - `curl` is already in alpine base
   - `openssl3` for Prisma
5. Validate locally with `docker build` then `docker run` with a sample env.
6. Roll out via PR: api first, monitor for 24h, then worker, then web.

## Size reference (current, May 2026)

| Image     | Slim   | Alpine (projected) | Savings |
| --------- | ------ | ------------------ | ------- |
| api       | 312 MB | ~210 MB            | -33%    |
| web       | 285 MB | ~190 MB            | -33%    |
| ai-worker | 305 MB | ~205 MB            | -33%    |

Pull bandwidth on a single Railway service redeploy: ~900 MB → ~600 MB.
Marginal at our current scale; meaningful at 10× growth.

## Open questions

- Do we already need `procps` (`ps`, `top`) for liveness debugging in prod?
  None of the current playbooks rely on it — alpine is fine.
- Is there an `apt` package we install at runtime today? Just `curl` and
  `openssl` — both available on alpine.
