# IMPLEMENTATION PLAN — KnackCook (affiliate-kk)

**Domain:** knackcook.com
**Version:** 1.0
**Date:** 2026-05-29

> **WHEN** and **in what order** we build. Requirements are in [`REQUIREMENTS.md`](./REQUIREMENTS.md), the architecture in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 0. Blocking prerequisites (do BEFORE / IN PARALLEL with Phase 1)

These are not code but they gate the launch. Handle them with priority.

| # | Prerequisite | Why it blocks | Status |
|---|---|---|---|
| PR-1 | **Create the Amazon Associates account** + obtain the **affiliate tag** | Without a tag, no link generates a commission | ⛔ not done |
| PR-2 | Choose the target **English market** (amazon.com vs .co.uk) | Determines the locale→marketplace→tag mapping | ⛔ to decide |
| PR-3 | **Upgrade the Hostinger VPS KVM1 → KVM2** | 1 vCPU insufficient with n8n (see ARCHITECTURE §14) | ⛔ to do |
| PR-4 | Point **knackcook.com DNS** to Cloudflare → VPS | HTTPS, hreflang, canonical | ⛔ to do |
| PR-5 | Prepare the **secrets** (`INGEST_API_KEY`, Google OAuth, GA placeholder) | Ingestion API + auth | ⛔ to do |

> ⚠️ **Compliance reminder:** until the account reaches **10 qualified sales over a rolling 30 days**, **no Creators API access** → we stay in editorial mode (no price displayed). The API unlock is a **business milestone**, not a dev task.

---

## Phase overview

```
Phase 0  Prerequisites & foundations       (~ week 1)
Phase 1  Infra + compliant ingestion       (weeks 1-2)
Phase 2  Public site MVP (English-only)     (weeks 3-4)
Phase 3  Blog + features (compare/news.)   (weeks 4-5)
Phase 4  SEO + legal compliance             (weeks 5-6)
Phase 5  Full admin dashboard               (weeks 6-7)
Phase 6  Polish, perf, monitoring          (week 8+)
Phase 7  Creators API switch (≥10 sales) — TRIGGERED BY A BUSINESS MILESTONE
Phase 8  Active i18n (2nd market)          — once market 1 is profitable
```

---

## Phase 0 — Project foundations (week 1)

- [ ] Init the **Next.js 16** project + strict TypeScript + **pnpm**.
- [ ] Configure **Biome** (lint + format), strict `tsconfig`, path aliases.
- [ ] Set up **Tailwind + shadcn/ui**.
- [ ] Set up **Prisma** + the initial schema (see ARCHITECTURE §5), first migration.
- [ ] Configure **next-intl** (only the `en` locale active, multi-arch ready).
- [ ] Documented `.env.example` + folder structure (`app/`, `lib/`, `components/`, `prisma/`, `messages/`).
- [ ] Minimal CI: lint + typecheck + tests on push.

**DoD Phase 0:** `pnpm dev` starts, `pnpm build` passes, Biome + typecheck green, Prisma migration applied.

---

## Phase 1 — Infrastructure & compliant ingestion (weeks 1-2)

- [ ] **Docker Compose:** app, postgres, redis, meilisearch, nginx (n8n already present).
- [ ] Per-container memory limits (see ARCHITECTURE §14.3).
- [ ] Nginx: reverse proxy, `/media` serving, rate limiting.
- [ ] Cloudflare in front of the VPS (SSL, edge cache).
- [ ] **`POST /api/ingest/products` API:** Bearer token + **Zod** validation + **upsert by ASIN** + entry as **DRAFT**.
- [ ] **`POST /api/ingest/articles` API:** AI drafts as DRAFT.
- [ ] Compliance guardrails: **reject any price/raw review/Amazon image** in the payload.
- [ ] Write `SyncLog` + response `{ created, updated, skipped, errors }`.
- [ ] Meilisearch indexing triggered on publish.
- [ ] **Vitest tests** on ingestion (upsert, idempotency, compliance rejections).

**DoD Phase 1:** an n8n call (or curl) creates/updates products as DRAFT; duplicates impossible; non-compliant payload rejected; tests green.

---

## Phase 2 — Public site MVP, English-only (weeks 3-4)

- [ ] Global i18n layout (`/[locale]/…`), header/footer, **affiliate disclosure** in the footer.
- [ ] **Homepage** (ISR): featured products, categories, latest articles.
- [ ] **Product page** (ISR): editorial rating, rewritten review, **no price**, **"View on Amazon" CTA**, disclosure near the CTA, editorial/placeholder image, related products, breadcrumb.
- [ ] **price-provider = EditorialPriceProvider** (display:'none').
- [ ] **`/api/track/[asin]`:** log click (locale, User-Agent, isBot) → 302 redirect to the affiliate link (placeholder tag).
- [ ] **Category page** (SSR) + pagination.
- [ ] **Meilisearch search** (products + articles).
- [ ] **Wishlist** localStorage + wishlist page.
- [ ] Custom **404/500**.

**DoD Phase 2:** full visitor journey homepage → product → CTA click → Amazon redirect (tag present); click logged; search working. **No price displayed.**

---

## Phase 3 — Blog & features (weeks 4-5)

- [ ] **Blog index** + **article** (ISR) with per-type templates (guide/comparison/listicle/howto/news).
- [ ] **Embedded product cards** + **comparison table** in articles (M2M).
- [ ] **Author pages** (E-E-A-T) with bio/photo.
- [ ] Blog categories/tags + navigation.
- [ ] **Interactive comparator** (`/compare`, 2-4 products, shareable URL).
- [ ] **Newsletter:** form + double opt-in + n8n webhook to the email tool.
- [ ] **GDPR cookie consent** (blocks trackers before agreement).

**DoD Phase 3:** a published article shows clickable product cards; the comparator generates a shareable table; newsletter signup confirmed by email.

---

## Phase 4 — SEO & legal compliance (weeks 5-6)

- [ ] Localized `generateMetadata` (title, description, OG) per page.
- [ ] **JSON-LD:** `Product`, `Review` (editorial rating), `Article`, `BreadcrumbList`, `Person`.
- [ ] Dynamic **`sitemap.xml`** (multi-content) + **`robots.txt`** (blocks `/admin`, `/api`).
- [ ] **hreflang** + **canonical** per locale.
- [ ] **Legal pages:** affiliate disclosure, legal notice, privacy, cookies.
- [ ] Submit to **Google Search Console**.

**DoD Phase 4:** rich-results test OK (Product/Review/Article); sitemap accessible and submitted; disclosure visible everywhere; no Amazon-based `AggregateRating`.

---

## Phase 5 — Admin dashboard (weeks 6-7)

- [ ] **Auth.js:** email/password + Google OAuth, Redis sessions, `/admin` middleware.
- [ ] **RBAC** Super Admin / Editor + **AuditLog**.
- [ ] **Product management:** list/edit, DRAFT→PUBLISHED, editorial rating/review, enable/disable, preview, history.
- [ ] **Blog management:** rich DB editor, card/comparison insertion, DRAFT→IN_REVIEW→PUBLISHED, n8n AI-draft management, authors/categories/tags.
- [ ] **Category management** (order, assignment).
- [ ] **SEO editor** per product/article + SERP preview + 301 redirects.
- [ ] **Settings (Setting):** GA Measurement ID (lazy/consent), Creators API feature flag, **affiliate tags per marketplace**, legal text.
- [ ] **Analytics:** clicks/product, top clicked, clicks/day, summary dashboard.
- [ ] **Admin user management** + **n8n sync** (status, history, manual trigger).
- [ ] On-publish revalidation (`revalidateTag`).

**DoD Phase 5:** an editor publishes an approved product/article that appears publicly; GA can be enabled from the back office without a deploy; a Super Admin manages users and settings; an Editor has no access to settings.

---

## Phase 6 — Polish, perf & monitoring (week 8+)

- [ ] **Core Web Vitals** optimization (LCP < 2.5 s): `next/image`, fonts, React Compiler, Cloudflare cache.
- [ ] Advanced **Cloudflare** rules (cache, security headers, basic WAF).
- [ ] **Monitoring:** Uptime Kuma + Sentry.
- [ ] **Playwright E2E tests:** product→CTA journey, admin login, publishing.
- [ ] Light load testing + memory-limit tuning.
- [ ] VPS backups verified (including `/media`).

**DoD Phase 6:** Lighthouse perf ≥ 90; uptime/error alerts active; critical E2E green; backup restore tested.

---

## Phase 7 — Creators API switch (triggered by a business milestone)

> **Entry condition: ≥ 10 qualified sales over a rolling 30 days → Creators API access granted.**

- [ ] Obtain the Creators API keys.
- [ ] Implement **`CreatorsApiPriceProvider`** (Redis cache ≤ 1 h, timestamp).
- [ ] Enable the **feature flag** `creatorsApi.enabled` from the back office.
- [ ] Display **live price + disclaimer + timestamp**, re-enable price sort/filter.
- [ ] (Optional) Product images via API URLs (link, 24-hour expiry) instead of the placeholder.

**DoD Phase 7:** live prices displayed with a compliant disclaimer, cache ≤ 1 h, no regression on existing pages. The switch is reversible via the flag.

---

## Phase 8 — Active i18n: 2nd market (once market 1 is profitable)

- [ ] Enable a 2nd locale (e.g. `fr`) in next-intl + locale→marketplace→tag mapping.
- [ ] **DeepL via n8n** pipeline: batch translation → `*Translation` as DRAFT → editor approval.
- [ ] Verify multi-locale hreflang/sitemap.
- [ ] SEO QA per market.

**DoD Phase 8:** the 2nd market is served with approved translated content, indexed, with the correct affiliate tag — **with no rework**.

---

## Milestones & key dependencies

```
PR-1..PR-5 ──▶ Phase 1 ──▶ Phase 2 ──▶ Phase 3 ──▶ Phase 4
                                   └──▶ Phase 5 (admin, can overlap 3-4)
Phase 2/3/4/5 ──▶ Phase 6 (polish)
[Business milestone: 10 sales/30 days] ──▶ Phase 7 (Creators API)
[Market 1 profitable] ──▶ Phase 8 (active i18n)
```

| Risk | Impact | Mitigation |
|---|---|---|
| Associates account not created | No commission | PR-1 is top priority |
| Never reaching 10 sales → no API | No live price | Site works without it (editorial mode); SEO blog to generate sales |
| AI content penalized by Google | Traffic loss | Mandatory human approval (DRAFT→PUBLISHED) |
| OOM on the VPS | Downtime | KVM2 + memory limits + monitoring |
| Amazon compliance violation | Account ban | Guardrails coded in ingestion + compliance review (see AGENTS.md) |

---

## Definition of Done — global (MVP)

- [ ] Phases 0→6 completed (DoD met).
- [ ] Prerequisites PR-1..PR-5 resolved.
- [ ] No Amazon price/review/image displayed (compliance verified).
- [ ] Disclosure + legal pages live.
- [ ] CWV ≥ 90, monitoring active, backups tested.
- [ ] Submitted to Google Search Console.
