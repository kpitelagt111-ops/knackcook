# AGENTS.md — KnackCook (affiliate-kk)

Operational guide for any AI agent or developer working on this repository.
**Read this file in full before writing code.** Reference docs are in [`docs/`](./docs/).

---

## 1. The project in one sentence

An Amazon affiliate website (kitchen niche, **knackcook.com**), **compliant with Amazon Associates policies from day one**, fed by n8n, with a blog/comparator/newsletter, i18n-ready, hosted on a single VPS.

**Source docs (authority, in this order):**
1. [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md) — what to build.
2. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — how it's built.
3. [`docs/PLAN_IMPLEMENTATION.md`](./docs/PLAN_IMPLEMENTATION.md) — in what order.
4. [`docs/API.md`](./docs/API.md) — HTTP API reference (n8n ingestion, tracking, newsletter).

On conflict: REQUIREMENTS > ARCHITECTURE > PLAN > this file.

---

## 2. ⛔ Amazon compliance rules — NON-NEGOTIABLE

Breaking any of these can **get the affiliate account banned** (immediate termination, withheld commissions, ~3% reinstatement). Any PR that breaks them must be **rejected**.

1. **NEVER display an Amazon price** that does not come from the Creators API. At launch = **no price displayed** (CTA only). The only allowed price flows through `price-provider` (Creators API, cache ≤ 1 h, **mandatory disclaimer + timestamp**).
2. **NEVER copy/republish** Amazon review text, their stars, or the Amazon rating. We only display our **own editorial rating/review**.
3. **NEVER download/host** an Amazon product image. Media = our editorial visuals or a per-category placeholder.
4. **NEVER** use Schema.org `AggregateRating` based on Amazon data. Use `Review` with **our** editorial rating.
5. **Affiliate disclosure** mandatory (footer + near CTAs) + dedicated page.
6. The **ingestion API rejects** any payload containing a display price, a raw Amazon review, or an Amazon image.

> If a requested feature appears to require breaking these rules, **stop and flag it** — do not implement it.

---

## 3. Stack & versions

- **Next.js 16.2.x** (App Router) · **React 19.2** (React Compiler enabled)
- **TypeScript** strict · **pnpm** · **Biome** (lint + format)
- **Prisma** + **PostgreSQL 16** · **Redis 7** · **Meilisearch**
- **Auth.js (NextAuth v5)** · **next-intl** · **Tailwind + shadcn/ui**
- **Vitest** + **Playwright** · **Docker Compose** · **Nginx** · **Cloudflare**
- Hosting: **Hostinger KVM2** (n8n already installed)

Full details: [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) §2.

---

## 4. Repository structure (target)

```
affiliate-kk/
├── app/
│   ├── [locale]/                 # public i18n pages
│   │   ├── products/[slug]/
│   │   ├── category/[slug]/
│   │   ├── blog/[slug]/
│   │   ├── author/[slug]/
│   │   ├── compare/
│   │   └── search/
│   ├── admin/                    # dashboard (SSR, protected)
│   ├── api/
│   │   ├── ingest/products/      # Bearer, from n8n
│   │   ├── ingest/articles/
│   │   ├── track/[asin]/         # click → redirect
│   │   └── admin/
│   ├── sitemap.ts
│   └── robots.ts
├── components/                   # UI (shadcn + custom)
├── lib/
│   ├── price/                    # price-provider (Editorial | Creators)
│   ├── affiliate/                # buildAffiliateUrl, locale→tag mapping
│   ├── seo/                      # JSON-LD helpers
│   ├── i18n/                     # next-intl config
│   └── db.ts                     # Prisma client
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── messages/                     # UI translations (en.json, ...)
├── docs/                         # REQUIREMENTS / ARCHITECTURE / PLAN
├── docker-compose.yml
├── biome.json
├── .env.example
└── AGENTS.md
```

---

## 5. Commands

> ⚠️ Always **pnpm** (never npm/yarn). Do not commit `package-lock.json`/`yarn.lock`.

```bash
pnpm install            # dependencies
pnpm dev                # dev server
pnpm build              # production build
pnpm start              # production server

pnpm lint               # Biome check
pnpm format             # Biome format --write
pnpm typecheck          # tsc --noEmit

pnpm test               # Vitest (unit/integration)
pnpm test:e2e           # Playwright (targeted E2E)

pnpm prisma migrate dev # dev migration
pnpm prisma generate    # Prisma client
pnpm prisma studio      # DB explorer

docker compose up -d    # local/VPS stack
```

> Check the actual scripts in `package.json` before assuming a command name.

---

## 6. Code conventions

- **Strict TypeScript:** no `any`, no `@ts-ignore`/`@ts-expect-error`. If a type blocks you, fix the type.
- **Validate at boundaries:** every external input (ingestion API, forms, params) validated with **Zod**. No defensive validation on internal code.
- **Server Components by default;** `"use client"` only when client interaction is required.
- **Data access** centralized in `lib/` (no Prisma queries scattered across components).
- **i18n:** no hardcoded UI-facing text — go through next-intl (`messages/`). Content (products/articles) comes from the DB per locale.
- **No runtime translation:** translation happens via n8n/DeepL upstream (see ARCHITECTURE §9).
- **Prices:** always via `lib/price/provider.ts`. Never a price hardcoded/displayed elsewhere.
- **Affiliate links:** always via `lib/affiliate/buildAffiliateUrl`. Never an Amazon URL built by hand.
- Naming: files `kebab-case`, components `PascalCase`, functions/variables `camelCase`.
- **Biome decides** formatting — don't fight it.

---

## 7. Important product/content rules

- All ingested content (product/article) enters **`DRAFT`** → **manual** publishing after editor approval (`DRAFT → IN_REVIEW → PUBLISHED`).
- **`AI_DRAFT` source** = must go through human approval before `PUBLISHED` (anti Google Helpful-Content penalty).
- **Meilisearch reindexing** and **ISR revalidation** (`revalidateTag`) trigger on **publish** and at the end of an **n8n sync**.
- **GA4:** Measurement ID read from `Setting` (back office), script loaded **after consent**, lazily — never hardcode it nor load it before consent.
- **Click tracking:** `/api/track/[asin]` logs (locale, User-Agent, isBot) then redirects. Keep it simple.

---

## 8. Security & secrets

- Secrets in `.env` (never committed). Keep `.env.example` up to date.
- Sensitive keys: `INGEST_API_KEY`, `AUTH_SECRET`, Google OAuth, (future) Creators API, GA ID.
- `/admin/*` and `/api/admin/*`: Auth.js session + RBAC verified **server-side** on every action.
- `/api/ingest/*`: Bearer token + Zod + rate limit.
- Never `--no-verify`, never bypass a hook.

---

## 9. Tests & verification (before saying "done")

A task is **NOT done** until:

- [ ] `pnpm typecheck` passes (zero errors).
- [ ] `pnpm lint` passes.
- [ ] `pnpm build` passes (exit 0).
- [ ] The relevant tests pass (`pnpm test`, and `test:e2e` for critical journeys).
- [ ] The behavior was **actually executed** (not "should work"):
  - API → test via curl/script against the running service.
  - UI → verify in a browser (real journey).
- [ ] **Amazon compliance verified** on anything touching price/review/image/tag (§2).

Critical code that must always be covered by tests: **ingestion API**, **price-provider**, **buildAffiliateUrl**, **auth/RBAC**, **tracking**.

---

## 10. Git & PR

- Atomic commits, clear message (conventional style: `feat:`, `fix:`, `chore:`…).
- **Never** commit without an explicit request if you are an agent.
- Don't commit secrets, `media/` files, or a non-pnpm lockfile.
- A PR that breaks §2 (compliance) must be **blocked**.

---

## 11. Known pitfalls / reminders

- **No MinIO:** media = VPS filesystem + Cloudflare (low volume).
- **VPS = KVM2** (not KVM1): 1 vCPU was insufficient with n8n. Respect per-container memory limits (ARCHITECTURE §14.3).
- **Creators API ≠ available at launch:** requires ≥10 sales/30 days. The site MUST work without it (editorial mode).
- **Amazon tag:** configurable placeholder until the Associates account is approved (blocking prerequisite PR-1).
- **English-only at launch:** do not enable other locales without approved translated content.
