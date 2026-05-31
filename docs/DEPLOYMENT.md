# DEPLOYMENT — KnackCook (affiliate-kk)

How to deploy the site to the Hostinger **KVM2** VPS (Docker Compose), behind Cloudflare.
Domain: **knackcook.com**. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) §14 for the infra rationale.

---

## 0. Prerequisites (one-time)

- [ ] Hostinger VPS upgraded to **KVM2** (2 vCPU / 8 GB) — KVM1 is insufficient with n8n.
- [ ] Docker + Docker Compose installed on the VPS (n8n already runs there).
- [ ] DNS: `knackcook.com` (and `www`) pointed to Cloudflare → Cloudflare → VPS IP (proxied, orange cloud).
- [ ] **Amazon Associates account created + affiliate tag obtained** (blocking — PR-1). Put it in `.env` as `AMAZON_TAG_US`.
- [ ] A real `AUTH_SECRET` generated: `openssl rand -base64 32`.

---

## 1. Environment

On the VPS, in the project folder, create `.env` from `.env.example` and fill in:

```bash
cp .env.example .env
# Required for production:
#   NODE_ENV=production
#   NEXT_PUBLIC_SITE_URL=https://knackcook.com
#   DATABASE_URL=postgresql://knackcook:<STRONG_PW>@postgres:5432/knackcook?schema=public
#   POSTGRES_PASSWORD=<STRONG_PW>
#   REDIS_URL=redis://redis:6379
#   MEILISEARCH_HOST=http://meilisearch:7700
#   MEILISEARCH_MASTER_KEY=<STRONG_KEY>
#   AUTH_SECRET=<openssl rand -base64 32>
#   AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET (from Google Cloud OAuth consent)
#   INGEST_API_KEY=<STRONG_SECRET>   (must match the n8n workflow)
#   AMAZON_TAG_US=<your-associates-tag>
#   N8N_SYNC_WEBHOOK_URL=<optional, your n8n webhook>
```

> Never commit `.env`. Service hostnames (`postgres`, `redis`, `meilisearch`) resolve over the Docker network.

---

## 2. Build & start the stack

```bash
docker compose build app
docker compose up -d            # postgres, redis, meilisearch, app, nginx
docker compose ps               # all healthy?
```

The `app` container runs the standalone Next.js server (`node server.js`). Nginx terminates HTTP on :80 and proxies to the app; Cloudflare provides SSL at the edge.

---

## 3. Database migration & seed (first deploy)

```bash
# apply schema
docker compose exec app npx prisma migrate deploy

# create the first super-admin (change the password immediately after)
docker compose exec app node scripts/seed-admin.mjs
# default: admin@knackcook.com / Admin12345!  → CHANGE IT via /admin/users
```

Index published products into Meilisearch:

```bash
curl -X POST https://knackcook.com/api/ingest/reindex \
  -H "Authorization: Bearer $INGEST_API_KEY"
```

---

## 4. Cloudflare

- SSL/TLS mode: **Full (strict)** (Nginx should have an origin cert) or **Full**.
- Always Use HTTPS: **on**. Auto HTTPS Rewrites: **on**.
- Cache: cache static assets (`/_next/static/*`, `/media/*`) aggressively; bypass cache for `/admin/*` and `/api/*`.
- Security: enable the WAF managed ruleset; rate-limit `/api/ingest/*` and `/api/track/*` (Nginx also rate-limits — see `nginx/nginx.conf`).
- The app already sets HSTS + security headers (`next.config.ts`).

---

## 5. n8n wiring

- n8n (already on the VPS) calls `POST https://knackcook.com/api/ingest/products` and `/api/ingest/articles` with `Authorization: Bearer <INGEST_API_KEY>`.
- Payloads must be **editorial/rewritten** (no scraped Amazon price/review/image) — the API rejects non-compliant payloads with 400.
- Optional: set `N8N_SYNC_WEBHOOK_URL` so the admin "Trigger manual sync" button can call n8n.

---

## 6. Post-deploy verification

```bash
curl -I https://knackcook.com/en                     # 200 + security headers
curl -s https://knackcook.com/robots.txt             # Disallow: /admin
curl -s https://knackcook.com/sitemap.xml | head     # urls present
curl -I https://knackcook.com/admin                  # 307 -> /admin/login
```

- Log in at `https://knackcook.com/admin/login`, change the admin password, create real editors, delete the seed credentials.
- Submit `https://knackcook.com/sitemap.xml` to **Google Search Console**.

---

## 7. Monitoring & backups (Phase 6)

- **Uptime Kuma** (self-host on the VPS or external): monitor `/en` and `/admin/login`.
- **Sentry**: add a DSN + the Sentry SDK for error tracking (optional, not yet wired).
- **Backups**: enable Hostinger VPS snapshots; ensure the `pgdata` volume and `/media` are included. Test a restore.

---

## 8. Updates / redeploy

```bash
git pull
docker compose build app
docker compose up -d app
docker compose exec app npx prisma migrate deploy   # if schema changed
```

---

## 9. Compliance reminders (do not skip)

- No Amazon price/review/image is stored or displayed (enforced at the schema + ingestion layer).
- Affiliate disclosure is live (`/en/affiliate-disclosure`, footer).
- The Creators API (live prices) is **off** until the account reaches ≥10 qualified sales / 30 days; flip it later from **/admin/settings** (`creatorsApi.enabled`).
