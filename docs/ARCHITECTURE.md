# ARCHITECTURE — KnackCook (affiliate-kk)

**Domain:** knackcook.com
**Version:** 1.0
**Date:** 2026-05-29

> **HOW** the system is built. Requirements are in [`REQUIREMENTS.md`](./REQUIREMENTS.md), the plan in [`PLAN_IMPLEMENTATION.md`](./PLAN_IMPLEMENTATION.md).

---

## 1. Guiding principles

1. **Compliance by design** — no protected Amazon data (price outside the API, raw reviews, images) ever touches the system. Enforced at the data model and ingestion API level.
2. **API-ready, not API-dependent** — the site works 100% without the Creators API. A `price-provider` abstraction layer lets it be enabled later via a feature flag.
3. **Content lives in the DB** — products, editorial reviews, articles, translations: all in PostgreSQL, editable from the back office, translatable per locale.
4. **The runtime neither translates nor scrapes** — translation and generation happen upstream (n8n); the site serves pre-rendered content.
5. **Single VPS, containerized** — Docker Compose on Hostinger KVM2, ready to scale vertically.

---

## 2. Technology stack

| Category | Technology | Target version | Role |
|---|---|---|---|
| Framework | **Next.js** (App Router) | **16.2.x** (stable, May 2026) | Front + API routes + admin |
| React runtime | **React** | **19.2** (React Compiler stable) | UI |
| Language | **TypeScript** | strict | Typing everywhere |
| UI | **Tailwind CSS + shadcn/ui** | — | Design system |
| ORM | **Prisma** | latest stable | Typed DB access |
| Database | **PostgreSQL** | 16+ | Data + full-text fallback |
| Cache / light queue | **Redis** | 7+ | Sessions, cache, rate limit |
| Search | **Meilisearch** | latest stable | Typo-tolerant search |
| Auth | **Auth.js (NextAuth v5)** | — | Email/password + Google OAuth |
| i18n | **next-intl** | — | Multi-locale (subpaths) |
| Own media | **VPS filesystem + Cloudflare** | — | Blog/author/OG images (no MinIO) |
| Translation (Phase 2+) | **DeepL** (n8n node) | — | Batch translation off-runtime |
| Automation | **n8n** (already installed) | — | Product discovery, AI generation, ingestion |
| Reverse proxy | **Nginx** | — | Routing, internal SSL, rate limit |
| CDN / DDoS / SSL | **Cloudflare** (free) | — | Edge cache + protection |
| Hosting | **Hostinger KVM2** | 2 vCPU / 8 GB / 100 GB | Single VPS |
| Containerization | **Docker Compose** | — | Orchestration |
| Package manager | **pnpm** | — | Dependencies |
| Lint/format | **Biome** | — | Code quality |
| Tests | **Vitest + Playwright** | — | Unit/integration + targeted E2E |
| Monitoring | **Uptime Kuma + Sentry** | — | Availability + errors |

> ⚠️ **MinIO removed** from the original PRD: unnecessary since we don't host Amazon images. Own media (low volume) goes on the VPS filesystem, cached by Cloudflare.

---

## 3. Architecture diagram

```
                         Visitor
                            │
                   Cloudflare (CDN + DDoS + SSL + edge cache)
                            │
                       Nginx (reverse proxy, rate limit)
                            │
        ┌───────────────────┴───────────────────┐
        │            Next.js 16 (Docker)         │
        │  - Public pages (ISR/SSR, i18n)        │
        │  - /admin/* (SSR, Auth.js-protected)   │
        │  - /api/ingest/*   (Bearer, from n8n)  │
        │  - /api/track/[asin] (click → redirect)│
        │  - /api/admin/*    (session)           │
        │  - price-provider (Editorial|Creators) │
        └───────────────────┬───────────────────┘
                            │
   ┌──────────────┬─────────┴────────┬───────────────┐
   │ PostgreSQL   │      Redis        │  Meilisearch  │
   │ (Prisma)     │ (sessions/cache)  │  (search)     │
   └──────────────┴──────────────────┴───────────────┘
                            ▲
                            │  POST /api/ingest/* (Bearer)
                   n8n (already on the VPS)
            product discovery · AI generation · (DeepL phase 2)
                            │
                  Own media: /var/app/media → Cloudflare
                            │
              Amazon (outbound): affiliate links, tag per locale
```

---

## 4. Rendering strategy

| Page | Strategy | Revalidation | Rationale |
|---|---|---|---|
| Homepage | ISR | 1 h | Semi-static content, SEO + perf |
| Product page | ISR | 1 h | Indexable, fast; revalidate on publish |
| Blog article | ISR | 1 h | Same |
| Category page | SSR | — | Dynamic filters/pagination |
| Author page | ISR | 6 h | Low volatility |
| Comparator | SSR / RSC | — | Dynamic selection |
| Search | SSR | — | Live Meilisearch queries |
| Admin | SSR (no-cache) | — | Private data |

> On-demand revalidation: `revalidatePath`/`revalidateTag` triggered on **publish** from the back office and at the end of an **n8n sync**, so we don't wait the 1-hour ISR.

---

## 5. Data model (Prisma)

> Designed for: (a) zero protected Amazon data, (b) i18n via `Translation` tables, (c) price-provider swap, (d) blog M2M products.

```prisma
// ──────────────── PRODUCTS ────────────────
model Product {
  id              String   @id @default(cuid())
  asin            String   @unique
  brand           String?
  slug            String   @unique            // SEO, base locale
  status          ContentStatus @default(DRAFT) // DRAFT | IN_REVIEW | PUBLISHED
  isActive        Boolean  @default(false)     // public visibility
  editorialRating Float?                        // OUR rating /10 (never Amazon)
  editorialReview String?  @db.Text            // REWRITTEN review (never Amazon)
  prosCons        Json?                         // { pros: string[], cons: string[] }
  placeholderKey  String?                       // editorial/placeholder image per category
  marketplace     String                        // e.g. "amazon.com"
  popularity      Int      @default(0)          // derived from clicks (cache)
  metaTitle       String?
  metaDescription String?
  categoryId      String?
  category        Category? @relation(fields: [categoryId], references: [id])
  images          ProductImage[]                // OUR images only
  translations    ProductTranslation[]
  articles        ArticleProduct[]
  clicks          ClickEvent[]
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  // NOTE: no persistent "price" field for display.
  // Price comes from the price-provider at runtime (Editorial=null, Creators=live).
  @@index([status, isActive])
  @@index([categoryId])
}

model ProductTranslation {
  id              String  @id @default(cuid())
  locale          String                         // "en", "fr", ...
  title           String
  editorialReview String? @db.Text
  metaTitle       String?
  metaDescription String?
  slug            String                         // localized slug
  productId       String
  product         Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  @@unique([productId, locale])
  @@unique([locale, slug])
}

model ProductImage {            // OUR media only (never Amazon)
  id        String  @id @default(cuid())
  path      String                              // filesystem path served via Cloudflare
  alt       String?
  order     Int     @default(0)
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model Category {
  id             String   @id @default(cuid())
  slug           String   @unique
  order          Int      @default(0)
  placeholderKey String?                         // category default placeholder
  products       Product[]
  translations   CategoryTranslation[]
}

model CategoryTranslation {
  id         String   @id @default(cuid())
  locale     String
  name       String
  slug       String
  categoryId String
  category   Category @relation(fields: [categoryId], references: [id], onDelete: Cascade)
  @@unique([categoryId, locale])
}

// ──────────────── BLOG ────────────────
model Article {
  id           String       @id @default(cuid())
  type         ArticleType                       // GUIDE | COMPARISON | LISTICLE | HOWTO | NEWS
  slug         String       @unique
  status       ContentStatus @default(DRAFT)
  source       ContentSource @default(HUMAN)     // HUMAN | AI_DRAFT
  publishedAt  DateTime?
  authorId     String
  author       Author       @relation(fields: [authorId], references: [id])
  categoryId   String?
  blogCategory BlogCategory? @relation(fields: [categoryId], references: [id])
  tags         ArticleTag[]
  products     ArticleProduct[]                  // M2M cards/comparisons
  translations ArticleTranslation[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
  @@index([status, type])
}

model ArticleTranslation {
  id              String  @id @default(cuid())
  locale          String
  title           String
  body            String  @db.Text              // rich content (serialized MDX/HTML)
  excerpt         String?
  metaTitle       String?
  metaDescription String?
  slug            String
  articleId       String
  article         Article @relation(fields: [articleId], references: [id], onDelete: Cascade)
  @@unique([articleId, locale])
  @@unique([locale, slug])
}

model ArticleProduct {                           // M2M article ↔ product relation
  articleId String
  productId String
  role      String   @default("card")           // "card" | "comparison"
  order     Int      @default(0)
  article   Article  @relation(fields: [articleId], references: [id], onDelete: Cascade)
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  @@id([articleId, productId])
}

model Author {
  id           String   @id @default(cuid())
  slug         String   @unique
  name         String
  avatarPath   String?
  articles     Article[]
  translations AuthorTranslation[]               // bio per locale (E-E-A-T)
}

model AuthorTranslation {
  id       String @id @default(cuid())
  locale   String
  bio      String @db.Text
  authorId String
  author   Author @relation(fields: [authorId], references: [id], onDelete: Cascade)
  @@unique([authorId, locale])
}

model BlogCategory { id String @id @default(cuid()) slug String @unique articles Article[] translations BlogCategoryTranslation[] }
model BlogCategoryTranslation { id String @id @default(cuid()) locale String name String slug String blogCategoryId String blogCategory BlogCategory @relation(fields:[blogCategoryId],references:[id],onDelete:Cascade) @@unique([blogCategoryId, locale]) }
model Tag { id String @id @default(cuid()) slug String @unique articles ArticleTag[] }
model ArticleTag { articleId String tagId String article Article @relation(fields:[articleId],references:[id],onDelete:Cascade) tag Tag @relation(fields:[tagId],references:[id],onDelete:Cascade) @@id([articleId, tagId]) }

// ──────────────── TRACKING / LEADS ────────────────
model ClickEvent {
  id        String   @id @default(cuid())
  asin      String
  productId String?
  product   Product? @relation(fields: [productId], references: [id])
  timestamp DateTime @default(now())
  locale    String
  userAgent String?                              // bot detection
  isBot     Boolean  @default(false)
  @@index([asin, timestamp])
}

model Subscriber {
  id           String   @id @default(cuid())
  email        String   @unique
  locale       String
  confirmed    Boolean  @default(false)          // double opt-in
  confirmToken String?
  createdAt    DateTime @default(now())
}

// ──────────────── ADMIN / SYSTEM ────────────────
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String?                              // null if OAuth only
  name      String?
  role      Role     @default(EDITOR)            // SUPER_ADMIN | EDITOR
  accounts  Account[]                            // Auth.js (Google OAuth)
  sessions  Session[]
  createdAt DateTime @default(now())
}

model Setting {                                  // settings editable from the back office
  key   String @id                               // e.g. "ga.measurementId", "creatorsApi.enabled"
  value Json
}

model SyncLog {
  id        String   @id @default(cuid())
  startedAt DateTime @default(now())
  created   Int      @default(0)
  updated   Int      @default(0)
  skipped   Int      @default(0)
  errors    Json?
}

model AuditLog {
  id        String   @id @default(cuid())
  userId    String?
  action    String                               // e.g. "PUBLISH_ARTICLE"
  entity    String
  entityId  String?
  meta      Json?
  createdAt DateTime @default(now())
}

// Account / Session: standard Auth.js tables (omitted here for readability)

enum ContentStatus { DRAFT IN_REVIEW PUBLISHED }
enum ContentSource { HUMAN AI_DRAFT }
enum ArticleType   { GUIDE COMPARISON LISTICLE HOWTO NEWS }
enum Role          { SUPER_ADMIN EDITOR }
```

---

## 6. The `price-provider` layer (the heart of API-ready compliance)

A single interface consumed by the front end. The implementation is chosen by a feature flag.

```ts
// lib/price/provider.ts
export interface PriceData {
  display: 'none' | 'price';          // 'none' at launch
  amount?: number;
  currency?: string;
  updatedAt?: Date;                   // for the disclaimer + timestamp
  disclaimer?: string;
}

export interface PriceProvider {
  getPrice(asin: string, locale: string): Promise<PriceData>;
}

// Launch: no price → CTA only
export class EditorialPriceProvider implements PriceProvider {
  async getPrice() { return { display: 'none' as const }; }
}

// API phase (≥10 sales): Creators API, Redis cache ≤ 1h, mandatory disclaimer
export class CreatorsApiPriceProvider implements PriceProvider {
  async getPrice(asin: string, locale: string): Promise<PriceData> {
    // 1. read Redis cache (TTL 1h max — Amazon policy)
    // 2. otherwise call Creators API, store timestamp
    // 3. return { display:'price', amount, currency, updatedAt, disclaimer }
  }
}

// Selection by flag (Setting "creatorsApi.enabled")
export function getPriceProvider(): PriceProvider { /* flag → impl */ }
```

**Amazon rules encoded here:** price cache ≤ 1 h, disclaimer + timestamp displayed whenever a price is shown, never a price outside the API.

---

## 7. Affiliate links & multi-marketplace

```ts
// lib/affiliate/links.ts
// locale → marketplace → tag mapping (from Setting, configurable in the back office)
const MARKETPLACES = {
  en: { host: 'www.amazon.com',    tag: '{{AMAZON_TAG_US}}' },
  // fr: { host: 'www.amazon.fr',  tag: '{{AMAZON_TAG_FR}}' },  // add without rework
} as const;

export function buildAffiliateUrl(asin: string, locale: string): string {
  const mp = MARKETPLACES[locale] ?? MARKETPLACES.en;
  return `https://${mp.host}/dp/${asin}?tag=${mp.tag}`;
}
```

The CTA points to `/api/track/[asin]`, which logs the click then redirects (302) to `buildAffiliateUrl`.

> ⚠️ Tags = **configurable placeholders** until the Amazon Associates account is approved (blocking prerequisite).

---

## 8. Ingestion API (n8n → site)

```
POST /api/ingest/products      Authorization: Bearer {INGEST_API_KEY}
POST /api/ingest/articles      Authorization: Bearer {INGEST_API_KEY}
```

- Payload validation via a **Zod schema**; detailed 400 rejection.
- **Upsert by ASIN** (products); idempotent.
- Always enters **DRAFT** → manual publishing after editor approval.
- **No Amazon image** accepted/downloaded.
- Response: `{ success, created, updated, skipped, errors[] }`.
- Writes a `SyncLog` + triggers `revalidateTag` on publish.

```jsonc
// product payload (compliant: no display price, no raw review)
{
  "asin": "B0XXXX",
  "brand": "Acme",
  "category": "Kitchen",
  "marketplace": "amazon.com",
  "editorialDraft": {            // content REWRITTEN by n8n (AI)
    "title": "...",
    "editorialReview": "Rewritten synthesis ...",
    "prosCons": { "pros": ["..."], "cons": ["..."] },
    "editorialRating": 8.5
  }
}
```

---

## 9. i18n

- **next-intl**, locales as **subpaths** (`/en`, `/fr`, …).
- Localized content via the `*Translation` tables (unique localized slug per locale).
- `hreflang` + `canonical` generated per locale; multi-locale `sitemap.xml`.
- **No runtime translation.** Phase 2+: n8n calls the **DeepL node**, writes the `*Translation` rows as DRAFT, the editor approves.
- At launch: only the `en` locale is active; adding a locale = data + a mapping entry, **with no rework**.

---

## 10. Authentication & authorization

- **Auth.js (NextAuth v5):** Credentials provider (email/password, argon2/bcrypt hash) + Google OAuth.
- Sessions in Redis.
- Next middleware protects `/admin/*` and `/api/admin/*`.
- RBAC: `SUPER_ADMIN` (everything) vs `EDITOR` (content only). Verified server-side on every action.
- `AuditLog` on sensitive actions.

---

## 11. Tracking, analytics & consent

- `/api/track/[asin]`: insert `ClickEvent` (locale, User-Agent, heuristic `isBot`) **then** 302 redirect. Simple/synchronous (low volume, acceptable).
- **GA4:** `Measurement ID` read from `Setting` (back office), script loaded via `next/script` **after consent** (lazy) → zero LCP impact.
- **Cookie consent** blocks all trackers before agreement (GDPR).

---

## 12. Search (Meilisearch)

- `products` and `articles` indexes (per locale or a filterable `locale` field).
- Reindex on **publish** and at the end of an **n8n sync**.
- Settings: typo tolerance, synonyms (cooking vocabulary), filterable attributes (category, rating, popularity).

---

## 13. Media

- Stored on the **VPS filesystem** (`/var/app/media`), served via Nginx, **cached by Cloudflare** (immutable + hash in the file name).
- `next/image` for responsiveness/optimization.
- Backups: the media folder is included in VPS snapshots.

---

## 14. Infrastructure & deployment

### 14.1 VPS — Hostinger KVM2 (upgrade from KVM1)

> KVM1 (1 vCPU / 4 GB) is **insufficient** with n8n already present: a single core shared between Next/Postgres/Meilisearch/n8n → throttled builds/ISR + OOM risk. **KVM2 (2 vCPU / 8 GB / 100 GB, ~€9/month) = the viable minimum.**

### 14.2 Docker Compose (services)

```yaml
services:
  app:          # Next.js 16 (production)
  postgres:     # PostgreSQL 16
  redis:        # Redis 7
  meilisearch:  # search
  nginx:        # reverse proxy + rate limit
  # n8n: ALREADY installed on the VPS (outside this compose or shared network)
  # uptime-kuma / sentry-agent: monitoring (polish phase)
```

### 14.3 Memory limits (KVM2, 8 GB)

| Service | Indicative limit |
|---|---|
| app (Next) | 1.5 GB |
| postgres | 1.5 GB |
| meilisearch | 1 GB |
| redis | 256 MB |
| nginx | 128 MB |
| reserved for n8n + OS | ~2.5 GB |

### 14.4 Network

```
Cloudflare → Nginx (443) → app (3000)
Nginx also serves /media (filesystem) with a long cache.
n8n calls the ingestion API over the internal network (localhost/Docker network).
```

### 14.5 Estimated cost

| Item | Price |
|---|---|
| Hostinger KVM2 | ~€9/month |
| knackcook.com domain | ~€1/month |
| Cloudflare | €0 |
| VPS backups | ~€1–2/month |
| **Total** | **~€11–12/month** |

---

## 15. Security

- Ingestion API: secret **Bearer token** (rotatable), Zod validation, rate limit.
- `/admin`: Auth.js session + RBAC + middleware.
- HTTPS forced via Cloudflare; HSTS, CSP, security headers via Nginx/Next.
- Secrets in `.env` (never committed); documented `.env.example`.
- Rate limiting (Nginx + Redis) on public APIs and `/api/track`.
- `isBot` + Cloudflare to mitigate noise/abuse on tracking.

---

## 16. Technical SEO

- Next 16 Metadata API (`generateMetadata`) per page, localized.
- JSON-LD: `Product`, `Review` (editorial rating), `Article`, `BreadcrumbList`, `Person`.
- Dynamically generated `sitemap.xml` + `robots.txt` (multi-locale).
- ISR + Cloudflare cache for Core Web Vitals; `next/image`, optimized fonts, React Compiler.

---

## 17. Architecture decisions (ADR summaries)

| # | Decision | Reason |
|---|---|---|
| ADR-1 | No Amazon price/review/image stored | Operating Agreement compliance (ban risk) |
| ADR-2 | `price-provider` layer + feature flag | Enable the Creators API without rework |
| ADR-3 | MinIO removed → filesystem + Cloudflare | Low volume, fewer services |
| ADR-4 | Translation off-runtime (n8n/DeepL) | SEO + perf + cost |
| ADR-5 | Upgrade KVM1 → KVM2 | 1 vCPU insufficient with n8n |
| ADR-6 | Editorial rating/review + Schema.org `Review` | Compliant + legitimate rich snippets |
| ADR-7 | Single Next app (no monorepo) | No multi-package need |
| ADR-8 | Simple synchronous tracking + User-Agent | Low volume, simplicity |
