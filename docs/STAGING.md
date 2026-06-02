# Staging — staging.knackcook.com

Runs on the **same VPS** as production, fully isolated:

- Separate Postgres / Redis / Meilisearch volumes (no shared data)
- Separate Docker Compose project (`knackcook-staging`)
- Served by the **prod nginx** via `Host` header routing (single nginx, single cert)
- App binds to host port `3100` (prod nginx upstream `host.docker.internal:3100`)
- Smaller memory limits (prod stays priority)
- `X-Robots-Tag: noindex, nofollow` — invisible to Google

## Workflow

```
local                staging branch             main branch
─────                ──────────────              ───────────
feature work   ──►   PR merged into       ──►    PR merged into
                     `staging`                   `main`
                          │                           │
                          ▼                           ▼
                  auto-deploy to            auto-deploy to
                  staging.knackcook.com     knackcook.com
```

1. Create branch `feature/<thing>` from `main`
2. Push, open PR against `staging`
3. Merge into `staging` → deploy staging → click around `staging.knackcook.com`
4. If good → PR `staging` → `main` → deploy prod

## One-time VPS bootstrap

```bash
# As deploy user on VPS
cd /home/deploy
git clone https://github.com/kpitelagt111-ops/knackcook.git knackcook-staging
cd knackcook-staging
git checkout staging   # create if needed: git checkout -b staging

# Build staging env (use DIFFERENT secrets than prod)
cp .env.staging.example .env
nano .env   # fill in CHANGE_ME values (generate with openssl rand)
chmod 600 .env

# Build + start
docker compose -f docker-compose.staging.yml -p knackcook-staging build app
docker compose -f docker-compose.staging.yml -p knackcook-staging up -d

# Migrate + seed admin
docker compose -f docker-compose.staging.yml -p knackcook-staging exec app prisma migrate deploy
docker compose -f docker-compose.staging.yml -p knackcook-staging exec -e ADMIN_PASSWORD=stagingAdmin12345! app node scripts/seed-admin.mjs
```

## Recurring deploy (after merging into `staging`)

```bash
cd /home/deploy/knackcook-staging
git pull origin staging
docker compose -f docker-compose.staging.yml -p knackcook-staging build app
docker compose -f docker-compose.staging.yml -p knackcook-staging up -d app

# If schema changed:
docker compose -f docker-compose.staging.yml -p knackcook-staging exec app prisma migrate deploy
```

## Operate

```bash
# Status
docker compose -f docker-compose.staging.yml -p knackcook-staging ps

# Logs
docker compose -f docker-compose.staging.yml -p knackcook-staging logs --tail=50 app

# Stop staging entirely (frees RAM)
docker compose -f docker-compose.staging.yml -p knackcook-staging down

# Nuke staging DB (start fresh)
docker compose -f docker-compose.staging.yml -p knackcook-staging down -v
```

## Resource budget

| Service | Memory limit | Notes |
|---|---|---|
| `app` | 768m | smaller than prod (1536m) |
| `postgres` | 512m | smaller than prod (1536m) |
| `redis` | 128m | small |
| `meilisearch` | 512m | smaller than prod (1024m) |
| **Total** | **~1.9 GB** | VPS has 8 GB; prod ~4.7 GB → ~1.4 GB free |

## DNS

- Cloudflare DNS: `staging` CNAME → `knackcook.com` (Proxied 🟧)
- TLS cert: Cloudflare Origin Cert already covers `*.knackcook.com` — no action

## Security

- `noindex, nofollow` header keeps staging out of Google
- Add Cloudflare Access (Zero Trust) later to require login on `staging.*` — optional
- Same firewall (UFW) rules as prod (only 22/80/443 open)
