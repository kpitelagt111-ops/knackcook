# REQUIREMENTS — KnackCook (affiliate-kk)

**Project:** Amazon affiliate website (kitchen / cooking niche)
**Domain:** knackcook.com
**Version:** 1.0
**Date:** 2026-05-29
**Status:** Approved (from the clarification session)

> This document defines **WHAT** the system must do (requirements). The **HOW** is in [`ARCHITECTURE.md`](./ARCHITECTURE.md). The **WHEN** is in [`PLAN_IMPLEMENTATION.md`](./PLAN_IMPLEMENTATION.md).

---

## 0. Founding decision: Amazon compliance from day one

Every requirement below derives from one non-negotiable constraint, established from the **Amazon Associates Program Policies (14 Apr 2026)** and the **Operating Agreement (15 Oct 2025)**:

| Amazon constraint | Product consequence |
|---|---|
| **PA-API deprecated on 15 May 2026** → replaced by the **Creators API** | We target the Creators API, not PA-API |
| **Creators API access = 10 qualified sales over a rolling 30 days** | **No API access at launch** (brand-new account, 0 sales) |
| Displaying a price not sourced from the API = violation | **No price displayed at launch** (CTA only) |
| Copying/republishing Amazon reviews or star ratings = violation | **No Amazon reviews displayed** — editorial/rewritten content only |
| Downloading/hosting Amazon images = violation | **No Amazon images hosted** — editorial media + placeholder |
| Penalty = immediate termination, withheld commissions, ban (~3% reinstatement) | Strict compliance protects the business asset |

**Two-phase strategy:**
1. **Bootstrap phase (0 → 10 sales):** compliant editorial site, affiliate links without prices, rewritten content. The blog drives traffic and the first sales.
2. **API phase (≥ 10 sales/30 days):** enable the Creators API via a **feature flag** to display live price/images/availability (1-hour cache, disclaimer + timestamp), **with no rework** (the `price-provider` abstraction layer).

---

## 1. Personas

| Persona | Needs |
|---|---|
| **Public visitor** | Discover kitchen products, read guides/comparisons, click through to Amazon, subscribe to the newsletter |
| **Super Admin** | Manage everything: products, blog, categories, users, SEO, settings, sync |
| **Editor** | Create/edit/approve content (products, articles, translations) without access to system settings or user management |
| **n8n (system)** | Push products + review/article drafts via the ingestion API |

---

## 2. Functional requirements — Public site

### 2.1 Main pages

| Page | Route (i18n) | Requirements |
|---|---|---|
| Homepage | `/[locale]` | Featured products, categories, latest blog articles, latest products |
| Product page | `/[locale]/products/[slug]` | Details, editorial review, editorial rating, Amazon CTA, related products, breadcrumb, OG sharing |
| Category page | `/[locale]/category/[slug]` | Filtered list + pagination |
| Blog (index) | `/[locale]/blog` | Article list, filtering by type/category/tag |
| Blog article | `/[locale]/blog/[slug]` | Rich content, embedded product cards, comparison tables, author (E-E-A-T) |
| Author page | `/[locale]/author/[slug]` | Bio, photo, author's articles (E-E-A-T signal) |
| Comparator | `/[locale]/compare` | Select 2–4 products → side-by-side comparison table |
| Search | `/[locale]/search` | Full-text results (Meilisearch), products + articles |
| Wishlist | `/[locale]/wishlist` | Local favorites (localStorage), no account |
| Affiliate disclosure | `/[locale]/affiliate-disclosure` | FTC + Amazon legal notice |
| Legal pages | `/[locale]/legal/*` | Legal notice, privacy, cookie policy |
| 404 / 500 | — | Custom error pages |

### 2.2 Product page — displayed content

- **REQ-P-01:** title, brand, category, breadcrumb.
- **REQ-P-02:** **own editorial rating**, clearly labeled ("Our verdict: X/10") — never the Amazon rating.
- **REQ-P-03:** **rewritten editorial review** (synthesis, reformulated pros/cons) — never the Amazon review text.
- **REQ-P-04:** visual = own editorial image, otherwise a **per-category placeholder**. Never a hosted Amazon image.
- **REQ-P-05:** **no price displayed at launch.** A **"View on Amazon"** button = tracked affiliate link. (Live price later via the Creators API feature flag: price + disclaimer + timestamp.)
- **REQ-P-06:** related products / recommendations.
- **REQ-P-07:** "Add to wishlist" button (localStorage).
- **REQ-P-08:** OpenGraph sharing tags.
- **REQ-P-09:** **affiliate disclosure visible near the CTA.**

### 2.3 Search & filters

- **REQ-S-01:** global **typo-tolerant** full-text search (Meilisearch) across products **and** articles.
- **REQ-S-02:** product filters by category, editorial rating, popularity (clicks).
- **REQ-S-03:** sorting: relevance, top rated, newest, most clicked.
- **REQ-S-04:** no price sort/filter at launch (no price); enabled with the Creators API.

### 2.4 Blog

- **REQ-B-01:** article types — **buyer guide**, **comparison**, **listicle/top-N**, **how-to/tutorial**, **news**. Each type has its own template.
- **REQ-B-02:** an article can **embed product cards** (image, title, Amazon CTA) linked to real DB products.
- **REQ-B-03:** an article can embed a **comparison table** of products.
- **REQ-B-04:** **many-to-many** article ↔ product relation (internal SEO linking).
- **REQ-B-05:** blog categories and tags, dedicated navigation.
- **REQ-B-06:** every article has an **author** (author page, E-E-A-T).
- **REQ-B-07:** an article can be generated as an **AI draft via n8n**, then approved by an editor.

### 2.5 Interactive comparator

- **REQ-C-01:** the visitor selects **2 to 4 products** → comparison table (attributes, editorial rating, CTA).
- **REQ-C-02:** shareable comparison URL (SEO "X vs Y").

### 2.6 Newsletter / lead capture

- **REQ-N-01:** email signup form (footer + end of article).
- **REQ-N-02:** store emails in DB + double opt-in.
- **REQ-N-03:** forward subscribers to an email tool via **n8n** (outbound webhook).
- **REQ-N-04:** GDPR-compliant (explicit consent, unsubscribe).

### 2.7 Wishlist

- **REQ-W-01:** favorites stored in **localStorage** (no visitor account, no server-side data).
- **REQ-W-02:** wishlist page showing saved products with CTA.

---

## 3. Functional requirements — Admin dashboard (`/admin`)

### 3.1 Authentication & roles

- **REQ-A-01:** login via **email/password** + **Google OAuth**, persistent sessions.
- **REQ-A-02:** protect all `/admin/*` routes.
- **REQ-A-03:** roles **Super Admin** (everything) and **Editor** (content only, no settings or user management).
- **REQ-A-04:** audit log of sensitive actions (publish, delete, setting changes).

### 3.2 Product management

- **REQ-A-10:** paginated list + search/filters.
- **REQ-A-11:** manual editing of all fields.
- **REQ-A-12:** enable/disable (public visibility).
- **REQ-A-13:** status workflow **DRAFT → PUBLISHED** (editorial review approved before publishing).
- **REQ-A-14:** public page preview.
- **REQ-A-15:** delete + change history.
- **REQ-A-16:** edit the **editorial rating** and the **rewritten review**.

### 3.3 Blog management

- **REQ-A-20:** article CRUD via a **rich editor (WYSIWYG/MDX) stored in the DB**.
- **REQ-A-21:** insert product cards and comparison tables in the editor.
- **REQ-A-22:** workflow **DRAFT → IN_REVIEW → PUBLISHED**, scheduled publishing.
- **REQ-A-23:** manage AI drafts (from n8n): view, edit, approve.
- **REQ-A-24:** manage blog categories/tags and authors.

### 3.4 Category management

- **REQ-A-30:** category CRUD, display order, product ↔ category assignment.

### 3.5 SEO per content

- **REQ-A-40:** edit meta title, meta description, slug per product **and** per article.
- **REQ-A-41:** simulated Google SERP preview.
- **REQ-A-42:** redirect management (301) for changed slugs.

### 3.6 Settings (Super Admin)

- **REQ-A-50:** a **settings** table editable from the back office:
  - **Google Analytics:** on/off toggle + Measurement ID (lazy-loaded, after consent).
  - **Creators API feature flag:** on/off + keys (to switch price display).
  - **Affiliate tags** per marketplace (configurable placeholder until the Associates account is approved).
  - Legal contact info, disclosure text.

### 3.7 Analytics & stats

- **REQ-A-60:** clicks per product (from tracking), top clicked products, clicks/day trend.
- **REQ-A-61:** summary dashboard (traffic, Amazon conversions, popular articles).

### 3.8 Admin user management

- **REQ-A-70:** create/delete admin accounts (Super Admin only), role assignment.

### 3.9 n8n synchronization

- **REQ-A-80:** last sync status, import history (date, created/updated, errors).
- **REQ-A-81:** manual sync trigger.

---

## 4. Functional requirements — Ingestion API (n8n → site)

- **REQ-I-01:** `POST /api/ingest/products` endpoint protected by a **Bearer token** (secret).
- **REQ-I-02:** **upsert by ASIN** (create if new, update otherwise).
- **REQ-I-03:** idempotency — the same ASIN never creates a duplicate.
- **REQ-I-04:** the ingested product enters **DRAFT** (rewritten review unpublished until an editor approves).
- **REQ-I-05:** automatic Meilisearch indexing on publish.
- **REQ-I-06:** `POST /api/ingest/articles` endpoint for **article drafts** generated by n8n (enters DRAFT).
- **REQ-I-07:** structured response `{ success, created, updated, skipped, errors[] }`.
- **REQ-I-08:** **no Amazon image downloaded**; the image field at best stores an editorial reference or stays empty (placeholder).
- **REQ-I-09:** strict payload validation (schema); documented 4xx rejection on error.

> ⚠️ **Ingestion compliance:** n8n does NOT push raw Amazon review text or any price meant for display. It pushes **rewritten syntheses/drafts**. Compliance responsibility is shared and documented on the n8n workflow side.

---

## 5. Tracking & analytics

- **REQ-T-01:** every Amazon link goes through `/api/track/[asin]`, which **records the click** (synchronous, simple) then **redirects** to the Amazon URL with the **locale's affiliate tag**.
- **REQ-T-02:** tracked data — ASIN, timestamp, locale, **User-Agent** (to distinguish bots/humans).
- **REQ-T-03:** **Google Analytics 4** optional, **configurable from the back office** (Measurement ID in DB), **lazy-loaded after consent** — **zero LCP impact**.
- **REQ-T-04:** GDPR cookie consent blocking tracker loading before agreement.

---

## 6. Internationalization (i18n)

- **REQ-L-01:** **English-only launch**, but a **complete multi-market architecture from day one**.
- **REQ-L-02:** URL structure using **subpaths** `/[locale]/…` (e.g. `/en/`, `/fr/`).
- **REQ-L-03:** **hreflang** + **canonical** per locale.
- **REQ-L-04:** translated content **stored per locale** (a `Translation` table per entity); the site **never translates at runtime**.
- **REQ-L-05:** translation (Phase 2+) via the **DeepL node in n8n** → draft per locale → editor approval.
- **REQ-L-06:** **locale → Amazon marketplace → affiliate tag** mapping; the CTA builds the correct link based on the visitor's locale. At launch: a single market (English); adding more markets **with no rework**.

---

## 7. SEO

- **REQ-SEO-01:** `<title>`, `<meta description>` editable per product/article.
- **REQ-SEO-02:** OpenGraph per page.
- **REQ-SEO-03:** Schema.org **`Product`** + **`Review`** (with the **own editorial rating**). **Never `AggregateRating` based on Amazon.**
- **REQ-SEO-04:** Schema.org `Article` / `BreadcrumbList` / `Person` (author).
- **REQ-SEO-05:** dynamic `sitemap.xml` (products + articles + categories + authors).
- **REQ-SEO-06:** `robots.txt` (allow public, block `/admin`, `/api`).
- **REQ-SEO-07:** Core Web Vitals — target LCP < 2.5 s, CLS < 0.1, INP < 200 ms.
- **REQ-SEO-08:** **original** content (human in the loop) to avoid the Google Helpful-Content penalty.

---

## 8. Legal & compliance

- **REQ-LEG-01:** **affiliate disclosure** (FTC + Amazon) — visible in the footer **and** near every CTA ("As an Amazon Associate I earn from qualifying purchases").
- **REQ-LEG-02:** dedicated **Affiliate Disclosure** page.
- **REQ-LEG-03:** **legal notice**, **privacy policy**, **cookie policy** pages.
- **REQ-LEG-04:** GDPR **cookie consent** banner.
- **REQ-LEG-05:** no republication of Amazon proprietary content (reviews, ratings, images, prices outside the API).

---

## 9. Non-functional requirements

| Category | Requirement |
|---|---|
| **Performance** | LCP < 2.5 s (target < 1.5 s at 6 months). ISR on product/home pages, 1-hour revalidation. |
| **Availability** | Uptime ≥ 99.5% (MVP), 99.9% (6 months). |
| **Security** | Ingestion API protected by a Bearer token; `/admin` routes protected by session; mandatory HTTPS (Cloudflare); secrets in `.env` (never committed); rate limiting on public APIs. |
| **Scalability** | Single-VPS architecture (Hostinger KVM2); designed for VPS upgrade without rework. |
| **Maintainability** | Strict TypeScript; Biome (lint+format); Vitest + Playwright tests targeted at critical code. |
| **Compliance** | Strict adherence to Amazon Associates policies + GDPR (see §0 and §8). |
| **Cost** | Target infra ~€9–12/month (KVM2 + domain + backups). |

---

## 10. Out of scope (MVP)

- Public visitor accounts (public auth) — the wishlist stays in localStorage.
- Displaying real Amazon prices / images — **until the Creators API is unlocked**.
- Active multilingual translation — **English-only at launch** (architecture ready).
- Display advertising, subscriptions, other affiliate networks.
- RSS, real-time "trending" widget (deferred, not selected).

---

## 11. Success criteria (KPIs)

| KPI | MVP target | 6-month target |
|---|---|---|
| Pages indexed by Google | 300+ | 2,000+ |
| Monthly organic traffic | 1,000 visits | 20,000 visits |
| Qualified affiliate sales (API unlock) | **≥ 10 / 30 days** | maintained |
| CTR to Amazon | > 5% | > 8% |
| Uptime | 99.5% | 99.9% |
| LCP | < 2.5 s | < 1.5 s |

---

## 12. Blocking prerequisites (before launch)

- [ ] **Sign up for Amazon Associates** and obtain the **affiliate tag** (account not yet created). Without a tag, no link generates a commission.
- [ ] Point **knackcook.com DNS** to Cloudflare → VPS.
- [ ] **Upgrade the Hostinger VPS KVM1 → KVM2** (see [`ARCHITECTURE.md`](./ARCHITECTURE.md) §14, infra).
- [ ] Decide the target English market (amazon.com vs amazon.co.uk) and the matching tag.
