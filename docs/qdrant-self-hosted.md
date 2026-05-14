# Self-hosted Qdrant for CorpusAI

> When to use this guide: Qdrant Cloud's 1 GB free tier is enough for early
> development and a couple of small AIs. Past ~5 GB of vectors (≈10M chunks at
> 512 dims with scalar quantization) the Cloud bill grows faster than a single
> dedicated node, and customers on Enterprise plans often want full data
> residency. Self-hosting fixes both.

This guide replaces **Step 3** of [DEPLOYMENT.md](../DEPLOYMENT.md) — everything
else (Railway, Postgres, Redis, Stripe, Resend, OAuth, Sentry) stays the same.

## Architecture options

| Option                                                | Best for                        | Trade-off                                              |
| ----------------------------------------------------- | ------------------------------- | ------------------------------------------------------ |
| **A. Sidecar Docker** on the same Railway project     | < 10M vectors, single region    | Vector data tied to a Railway volume; no read replicas |
| **B. Dedicated VM** (Hetzner / Fly.io / DigitalOcean) | 10–100M vectors, custom backups | More ops                                               |
| **C. Kubernetes (Helm chart)**                        | Multi-region, autoscaling       | Significant ops overhead                               |

Pick option A unless you already have option C running. The rest of this guide
covers A and B.

## Option A — Sidecar on Railway

1. From the Railway project dashboard click **+ New** → **Empty Service**.
2. Name it `qdrant`.
3. Under **Settings → Source**, set:
   - **Source**: Docker Image
   - **Image**: `qdrant/qdrant:v1.13.0` (pin a specific tag; never use `latest`).
4. Under **Settings → Variables**, add:
   ```
   QDRANT__SERVICE__HTTP_PORT=6333
   QDRANT__SERVICE__API_KEY=<generate a random 32-char secret>
   QDRANT__STORAGE__SNAPSHOTS_PATH=/qdrant/snapshots
   QDRANT__LOG_LEVEL=INFO
   ```
5. Under **Settings → Networking**:
   - Generate a **private domain** (e.g. `qdrant.railway.internal`) — keep this
     internal, do not expose port 6333 publicly.
6. Under **Settings → Volumes**, mount:
   - `/qdrant/storage` → 5 GB (start small; grow when usage > 70%).
   - `/qdrant/snapshots` → 5 GB (for backup retention).
7. Restart the service.
8. In the `api` and `ai-worker` services, replace the two variables:
   ```
   QDRANT_URL=http://qdrant.railway.internal:6333
   QDRANT_API_KEY=<same value as QDRANT__SERVICE__API_KEY>
   ```
9. Redeploy `api` and `ai-worker`.
10. Verify the new collection lives on the sidecar:
    ```
    curl -H "api-key: $QDRANT_API_KEY" \
      "http://qdrant.railway.internal:6333/collections"
    ```

### Backups

Snapshots are stored in `/qdrant/snapshots`. Schedule them with the bundled
HTTP endpoint — the simplest way is a Railway cron service:

```bash
# Run daily 02:00 UTC
0 2 * * *  curl -s -X POST \
  -H "api-key: $QDRANT_API_KEY" \
  "http://qdrant.railway.internal:6333/collections/corpusai-vectors/snapshots"
```

Pull old snapshots to S3/R2 with `rclone` if you need offsite retention. The
free tier of Cloudflare R2 covers more than 100 GB of egress per month.

## Option B — Dedicated VM

Recommended specs for ≤ 50M vectors at 512 dims with int8 quantization and
HNSW `m=16`:

| Resource | Size                                |
| -------- | ----------------------------------- |
| vCPU     | 4                                   |
| RAM      | 16 GB                               |
| Disk     | NVMe SSD, ≥ 4× expected vector size |
| OS       | Ubuntu 22.04 LTS or Debian 12       |

### Steps

1. Provision the VM, attach a dedicated data disk mounted at `/var/lib/qdrant`.
2. Install Docker and create the systemd unit:

   ```ini
   # /etc/systemd/system/qdrant.service
   [Unit]
   Description=Qdrant vector database
   After=docker.service
   Requires=docker.service

   [Service]
   Restart=always
   ExecStartPre=-/usr/bin/docker rm -f qdrant
   ExecStart=/usr/bin/docker run --rm --name qdrant \
     -p 127.0.0.1:6333:6333 \
     -v /var/lib/qdrant/storage:/qdrant/storage \
     -v /var/lib/qdrant/snapshots:/qdrant/snapshots \
     -e QDRANT__SERVICE__API_KEY=${QDRANT_API_KEY} \
     -e QDRANT__SERVICE__HTTP_PORT=6333 \
     qdrant/qdrant:v1.13.0
   ExecStop=/usr/bin/docker stop qdrant

   [Install]
   WantedBy=multi-user.target
   ```

3. Put the API key in `/etc/default/qdrant` (mode 0600) and load it via
   `EnvironmentFile=/etc/default/qdrant` in the unit.
4. Front Qdrant with Caddy or Nginx for TLS termination:
   ```caddy
   qdrant.your-domain.com {
       reverse_proxy 127.0.0.1:6333
   }
   ```
5. Whitelist your Railway egress IP range (or use Tailscale / Cloudflare Tunnel
   if you want zero open ports).
6. Point `QDRANT_URL` in `api` and `ai-worker` to `https://qdrant.your-domain.com`.

### Disk sizing

Rule of thumb at 512 dims + int8 + HNSW (`m=16`, `ef_construct=100`):

- raw vector bytes ≈ `512 * 1 byte = 512 B`
- HNSW graph ≈ `m * 8 B * 2 = 256 B`
- payload + metadata ≈ `~400 B` (depends on your sources)

So a million chunks ≈ **1.1 GB** disk. Multiply by 2 for snapshots and
fragmentation headroom.

## Migrating from Qdrant Cloud

Stop accepting new uploads first (or accept a few seconds of write loss):

```bash
# 1. From any host that can reach Qdrant Cloud
curl -H "api-key: $CLOUD_KEY" \
  -X POST "$CLOUD_URL/collections/corpusai-vectors/snapshots"

# 2. Download the snapshot
curl -H "api-key: $CLOUD_KEY" \
  "$CLOUD_URL/collections/corpusai-vectors/snapshots/<snapshot-name>" \
  --output corpusai-vectors.snapshot

# 3. Upload to the self-hosted instance
curl -H "api-key: $SELF_KEY" \
  -X POST "$SELF_URL/collections/corpusai-vectors/snapshots/upload" \
  -F snapshot=@corpusai-vectors.snapshot
```

Then swap `QDRANT_URL` on `api` + `ai-worker` and redeploy.

## Operational tips

- **Health check**: `GET /readyz` returns 200 once the engine has loaded all
  segments. Add it to your uptime monitoring.
- **Metrics**: Qdrant exposes Prometheus metrics at `/metrics`. Scrape them
  from Grafana Cloud or a local Prometheus.
- **Upgrades**: pin the image tag, test the new version in staging for a week,
  then bump in prod. Snapshots are forward-compatible only within minor
  versions — read the [release notes](https://github.com/qdrant/qdrant/releases)
  before crossing a major.
- **Cost ballpark** at 5M chunks: Cloud ≈ $200/month, Hetzner CX32 + snapshots
  to R2 ≈ $25/month.
