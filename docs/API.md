# API Reference — KnackCook (affiliate-kk)

This document describes the **public HTTP APIs** of the site, with a focus on the
**ingestion API consumed by the n8n workflow**. n8n is the only producer expected to
call the `/api/ingest/*` endpoints.

> ⛔ **Compliance first.** Every ingestion payload is validated against the Amazon
> Associates rules in [`AGENTS.md` §2](../AGENTS.md). The ingestion API **rejects**
> any payload that carries Amazon-owned display data (price, rating/stars, review
> text, hosted image). See [Compliance guardrails](#compliance-guardrails).

---

## Table of contents

1. [Surfaces overview](#surfaces-overview)
2. [Authentication](#authentication)
3. [Ingestion API (n8n → site)](#ingestion-api-n8n--site)
   - [POST /api/ingest/products](#post-apiingestproducts)
   - [POST /api/ingest/articles](#post-apiingestarticles)
   - [POST /api/ingest/reindex](#post-apiingestreindex)
4. [Compliance guardrails](#compliance-guardrails)
5. [Publishing workflow (DRAFT → PUBLISHED)](#publishing-workflow-draft--published)
6. [Click tracking (public)](#click-tracking-public)
7. [Newsletter (public)](#newsletter-public)
8. [Error format](#error-format)
9. [Recommended n8n workflow](#recommended-n8n-workflow)
10. [Local testing & mock seeding](#local-testing--mock-seeding)

---

## Surfaces overview

| Surface | Endpoints | Caller | Auth |
|---|---|---|---|
| **Ingestion** (n8n import) | `POST /api/ingest/products`, `POST /api/ingest/articles`, `POST /api/ingest/reindex` | **n8n only** | `Bearer INGEST_API_KEY` |
| Click tracking | `GET /api/track/[asin]` | Browser (CTA clicks) | none |
| Newsletter | `POST /api/newsletter`, `POST /api/newsletter/confirm` | Browser | none |
| Auth | `GET/POST /api/auth/*` | Browser (Auth.js) | session |

The ingestion surface is **deliberately isolated** from everything else: it is the
single dedicated entry point n8n uses to import blogs and products/reviews. It never
touches auth, tracking, or newsletter logic.

---

## Authentication

All `/api/ingest/*` endpoints require a static **Bearer token**:

```
Authorization: Bearer <INGEST_API_KEY>
```

- The token is read from the `INGEST_API_KEY` environment variable.
- Comparison is constant-time-ish (length check + XOR accumulation) to avoid trivial
  timing leaks (`lib/ingest/auth.ts`).
- A missing or wrong token returns **`401 unauthorized`**.

> Rotate `INGEST_API_KEY` if it ever leaks, and update the n8n credential accordingly.

---

## Ingestion API (n8n → site)

### POST /api/ingest/products

Upserts products **by ASIN**. New products are created as **`DRAFT` / `isActive=false`**
(not publicly visible until an editor publishes them — see
[Publishing workflow](#publishing-workflow-draft--published)). Re-sending the same ASIN
**updates** the editorial fields (idempotent); it never duplicates and never overwrites
`status` / `isActive` / `slug` (the editor owns those).

If `category` is provided and does not exist yet, it is created automatically (slugified).

**Request body**

```jsonc
{
  "products": [            // 1..500 items
    {
      "asin": "B08XYZ1234",            // required, exactly 10 uppercase alphanumerics
      "brand": "KitchenForge",         // optional, <= 120 chars
      "category": "Stand Mixers",      // optional, <= 120 chars (auto-created)
      "marketplace": "amazon.com",     // optional, default "amazon.com"
      "editorialDraft": {              // required — OUR content only
        "title": "KitchenForge Artisan 5.5Qt Stand Mixer",   // required, 3..300
        "editorialReview": "After three weeks of daily doughs…", // optional rewritten prose
        "prosCons": {                   // optional
          "pros": ["Quiet motor", "Solid bowl-lift"],
          "cons": ["Heavy to move"]
        },
        "editorialRating": 9.1          // optional, 0..10 (OUR score, never Amazon)
      }
    }
  ]
}
```

**Response — `200 OK`** (or `207` if some rows were skipped)

```json
{ "success": true, "created": 10, "updated": 0, "skipped": 0, "errors": [] }
```

Each ingest run also writes a row to `SyncLog` (visible in the back office under Sync).

---

### POST /api/ingest/articles

Upserts blog article **drafts by slug**. Created with `status="DRAFT"` and
`source="AI_DRAFT"` — they must be approved/published by an editor (anti
Helpful-Content penalty). Referenced products are linked many-to-many **only if the
ASIN already exists**; unknown ASINs are silently ignored. If `authorSlug` does not
exist, the author is auto-created.

**Request body**

```jsonc
{
  "articles": [            // 1..200 items
    {
      "slug": "best-stand-mixers-2026",        // required, <= 200, unique key
      "type": "LISTICLE",                      // GUIDE | COMPARISON | LISTICLE | HOWTO | NEWS
      "authorSlug": "marlowe-finch",           // required (auto-created if missing)
      "title": "The Best Stand Mixers We Tested in 2026", // required, 3..300
      "body": "<p>…rich HTML/MDX body…</p>",   // required, rendered as article content
      "excerpt": "We baked our way through a dozen mixers.", // optional, <= 500
      "productAsins": ["B08XYZ1234", "B09ABC5678"]           // optional, <= 50, links existing products
    }
  ]
}
```

> **Order matters:** ingest products **before** articles so `productAsins` resolve to
> real product links. Embedded products render in the article's "Featured in this
> guide" section.

**Response — `200 OK`** (or `207` on partial)

```json
{ "success": true, "created": 10, "updated": 0, "skipped": 0, "errors": [] }
```

---

### POST /api/ingest/reindex

Rebuilds the Meilisearch product index from the currently **published** products.
Call this at the end of an n8n sync (and it also runs automatically on publish).

**Request:** empty body, Bearer auth.

**Response — `200 OK`**

```json
{ "success": true, "indexed": 12 }
```

`502` is returned if the search engine is unreachable (the site still works — search
falls back to a Postgres `contains` query).

---

## Compliance guardrails

The ingestion schemas use Zod **`.strict()`**, so **any unknown key is a hard `400`**.
The following product keys are explicitly forbidden because they imply scraped
Amazon-owned data:

```
price, currency, rating, reviewCount, reviews, images, imageUrl, amazonImage
```

n8n must send **only rewritten editorial content**. Examples that are **rejected with `400`**:

```jsonc
{ "products": [{ "asin": "B08XYZ1234", "price": 199.99,  "editorialDraft": { "title": "…" } }] } // ❌ price
{ "products": [{ "asin": "B08XYZ1234", "rating": 4.5,    "editorialDraft": { "title": "…" } }] } // ❌ Amazon stars
{ "products": [{ "asin": "B08XYZ1234", "imageUrl": "https://m.media-amazon.com/…", "editorialDraft": { "title": "…" } }] } // ❌ hosted image
```

What the site shows instead:
- **No price at launch** (CTA only; future prices flow exclusively through
  `lib/price/provider.ts` with the Creators API + mandatory disclaimer + timestamp).
- **Our own** `editorialRating` (0–10) and `editorialReview`, never Amazon's.
- A per-category **placeholder image**, never an Amazon-hosted image.
- `Review` JSON-LD with our editorial rating, never `AggregateRating` from Amazon.

---

## Publishing workflow (DRAFT → PUBLISHED)

Ingestion is intentionally **non-publishing**. Content enters as a draft and only
becomes public after editorial approval:

```
DRAFT  →  IN_REVIEW  →  PUBLISHED
```

- **Products** are public when `status="PUBLISHED"` **and** `isActive=true`.
- **Articles** are public when `status="PUBLISHED"` (and get a `publishedAt` stamp).
- On publish, Meilisearch reindex + ISR `revalidateTag` are triggered.

Editors do this from the **back office**. For local/demo seeding, the helper
[`scripts/publish-drafts.mjs`](../scripts/publish-drafts.mjs) flips the mock drafts to
published in one pass.

---

## Click tracking (public)

### GET /api/track/[asin]

Logs a `ClickEvent` (ASIN, locale, User-Agent, bot detection) then **302-redirects**
to the locale's affiliate URL built by `lib/affiliate/buildAffiliateUrl` (adds the
Associates tag). Tracking failures never block the redirect.

```
GET /api/track/B08XYZ1234?locale=en   →  302  https://www.amazon.com/dp/B08XYZ1234?tag=<AMAZON_TAG_US>
```

- `400 invalid asin` if the ASIN is malformed.
- All CTAs ("View on Amazon") must point at this endpoint — never hand-build an
  Amazon URL.

---

## Newsletter (public)

| Endpoint | Body | Notes |
|---|---|---|
| `POST /api/newsletter` | `{ "email": "user@example.com", "locale": "en" }` | Double opt-in: sends a confirmation token. |
| `POST /api/newsletter/confirm` | `{ "token": "…" }` | Confirms the subscription. |

---

## Error format

All JSON error responses share the same shape:

```json
{ "success": false, "error": "validation failed", "issues": [ /* Zod issues */ ] }
```

| Status | Meaning |
|---|---|
| `200` | Success. |
| `207` | Partial success (some rows skipped — see `errors[]`). |
| `400` | Invalid JSON, schema validation failure, or a forbidden (non-compliant) key. |
| `401` | Missing/invalid Bearer token. |
| `502` | Downstream dependency (Meilisearch) unreachable. |

---

## Recommended n8n workflow

1. **Fetch** product candidates (PA-API / Creators API once approved, or a curated list).
2. **Rewrite** into editorial content (title, review, pros/cons, rating /10) — strip
   every Amazon-owned field. (DeepL/LLM step.)
3. `POST /api/ingest/products` with the rewritten `editorialDraft` objects.
4. **Generate** articles referencing those ASINs; `POST /api/ingest/articles`.
5. `POST /api/ingest/reindex`.
6. **Editor** reviews drafts in the back office and publishes the approved ones.

> Keep the `INGEST_API_KEY` in an n8n credential, never inline in a node.

---

## Local testing & mock seeding

A single script exercises the whole ingestion surface end-to-end (negative tests +
compliance + a realistic 10-product / 10-article dataset):

```bash
# 1. Make sure the production server + Postgres/Redis/Meilisearch are running.
# 2. Run the n8n simulation (tests auth, validation, compliance, then seeds):
BASE_URL=http://localhost:3000 INGEST_API_KEY=<key> node scripts/n8n-mock.mjs

# 3. Publish the seeded drafts so the site looks production-real:
DATABASE_URL=postgresql://… node scripts/publish-drafts.mjs

# 4. Reindex search:
curl -X POST http://localhost:3000/api/ingest/reindex \
  -H "Authorization: Bearer <key>"
```

The mock content is **fictional but realistic** (invented brands like "KitchenForge",
fake `MOCK*` ASINs) and fully compliant — no Amazon price, rating, review or image.
