# Monitoring & alerting (KnackCook)

Operational reference for the production monitoring stack. Pair: **Sentry** (errors)
+ **Uptime Kuma** (availability). No Prometheus/Grafana — out of scope for KVM2.

## Overview

| Tool | Covers | Where it runs |
|---|---|---|
| **Sentry** | Application errors (server, edge, browser), performance traces, releases | SaaS (sentry.io), SDK in `instrumentation.ts` + `instrumentation-client.ts` |
| **Uptime Kuma** | HTTP availability + latency probes, status page, alert routing | Self-hosted, `uptime-kuma` service in `docker-compose.yml` |

Sentry is **optional**: when `SENTRY_DSN` is unset, the SDK init becomes a no-op
(see `instrumentation.ts` lines 13-16). Local builds without credentials succeed
because `next.config.ts` only wraps with `withSentryConfig` when DSN + auth
token + org + project are all set.

## Uptime Kuma

- **Image**: `louislam/uptime-kuma:1` (pinned to v1 major).
- **Host port**: `3001` → container `3001`.
- **Data volume**: `uptime-kuma-data:/app/data` (SQLite store + screenshots).
- **Memory limit**: `192m` (fits KVM2 budget per ARCHITECTURE §14.3).
- **Not** exposed publicly yet — bind via Nginx reverse-proxy under a protected
  subdomain (e.g. `status.knackcook.com` with Cloudflare Access) before opening
  it to the internet.

First boot: open `http://<vps>:3001`, create the admin account immediately
(Kuma exposes setup to the first visitor).

## Sentry

- **Tunnel route**: `/monitoring` — proxies SDK traffic through the Next app to
  bypass ad-blockers. Configured in `next.config.ts` (`tunnelRoute: "/monitoring"`).
  **Do not** block `/monitoring` in Cloudflare WAF or Nginx rules.
- **Source-map upload**: enabled when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`,
  `SENTRY_PROJECT` are all set at **build time**. Consumed by `withSentryConfig`
  in `next.config.ts`. `deleteSourcemapsAfterUpload: true` keeps the production
  bundle clean.
- **Sampling**: `tracesSampleRate: 0.1` server + client (see instrumentation
  files). `sendDefaultPii: false`. No session replay.
- **Releases**: tag each deploy with `SENTRY_RELEASE` (e.g. `git rev-parse --short HEAD`)
  before `pnpm build`. The Sentry webpack plugin auto-associates the uploaded
  source maps with that release.

### Enabling release tracking

```bash
export SENTRY_RELEASE=$(git rev-parse --short HEAD)
export SENTRY_AUTH_TOKEN=...   # org-level token, "project:releases" + "project:write"
export SENTRY_ORG=knackcook
export SENTRY_PROJECT=knackcook-web
pnpm build
```

Without `SENTRY_RELEASE`, errors are still captured but not grouped by deploy.

## Alert thresholds (Uptime Kuma UI)

Configure these monitors after first boot. Heartbeat interval = 60s unless noted.

| Monitor | Type | Target | Expected | Alert after |
|---|---|---|---|---|
| Homepage | HTTP(s) | `https://knackcook.com/` | 200 OK, body contains `KnackCook` | 2 consecutive failures |
| Product page (canary) | HTTP(s) — Keyword | `https://knackcook.com/en/products/<canary-slug>` | 200, body contains product title | 2 consecutive failures |
| Ingest health | HTTP(s) | `https://knackcook.com/api/ingest/health` | 200 JSON `{"ok":true}` | 3 consecutive failures |
| Track redirect | HTTP(s) — Status code | `https://knackcook.com/api/track/<canary-asin>` | **302** (not 200/4xx) | 2 consecutive failures |
| Sitemap | HTTP(s) | `https://knackcook.com/sitemap.xml` | 200, XML | 3 consecutive failures (low priority) |
| DB latency canary | (optional) HTTP(s) | `https://knackcook.com/api/health/db` | 200 < 1500ms | 3 consecutive failures |

Notification channels: at least **email** + one of Discord/Telegram/Slack webhook.
Set retry interval = 60s, "Notify when down" + "Notify when up". For the
track redirect monitor, **disable automatic redirect following** (HTTP Options →
Max Redirects = 0) so the 302 itself is the success condition.

If `/api/ingest/health` is not yet implemented, point the ingest monitor at
`/api/ingest/products` with a HEAD request and accept 401 (Bearer missing) as
the success status — this still proves the route is reachable.

## Env vars

| Var | Required for | Notes |
|---|---|---|
| `SENTRY_DSN` | Server/edge error capture | No DSN → SDK no-op |
| `NEXT_PUBLIC_SENTRY_DSN` | Browser error capture | Distinct project DSN, public |
| `SENTRY_AUTH_TOKEN` | Source-map upload at build | Org-level, build-time only |
| `SENTRY_ORG` | Source-map upload | e.g. `knackcook` |
| `SENTRY_PROJECT` | Source-map upload | e.g. `knackcook-web` |
| `SENTRY_ENVIRONMENT` | Environment tagging | Defaults to `NODE_ENV` |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | Same, browser side | Defaults to `NODE_ENV` |
| `SENTRY_RELEASE` | Release association | Set in CI before `pnpm build` |

Consumption sites:
- `next.config.ts` (build-time: auth token, org, project, DSN gate)
- `instrumentation.ts` (Node/edge runtime: DSN, environment)
- `instrumentation-client.ts` (browser: public DSN, public environment)

## Runbook

**Site returns 5xx in Sentry but Uptime Kuma green** → likely a hot path
regression, not an outage. Triage by release in Sentry, roll back if needed.

**Uptime Kuma red on homepage, Sentry quiet** → infrastructure: Nginx, Cloudflare,
or `app` container OOM. Check `docker compose ps`, `docker compose logs app --tail=200`.

**Track redirect monitor red (non-302)** → either ASIN missing in DB or
`/api/track/[asin]` regressed; affiliate clicks are silently lost — treat as
**P1**. Verify with `curl -I https://knackcook.com/api/track/<asin>`.

**Ingest monitor red** → n8n cron will back up. Check Bearer rotation, rate
limit headers, and `app` logs for Zod validation rejections.

**Sentry quota exhausted** → temporarily set `tracesSampleRate` to 0 in the
two instrumentation files and redeploy; investigate noisy issue, then restore.
