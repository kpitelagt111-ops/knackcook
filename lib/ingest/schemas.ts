import { z } from "zod";

/**
 * Ingestion payload schemas (n8n → site).
 *
 * ⛔ COMPLIANCE GUARDRAILS (docs/AGENTS.md §2):
 * The payload MUST NOT contain Amazon-owned data meant for display:
 *   - no display `price` / `currency`
 *   - no raw Amazon `reviews` (text/stars/author)
 *   - no `rating` sourced from Amazon
 *   - no Amazon `images` / `imageUrl` to host
 * n8n pushes ONLY rewritten editorial drafts. `.strict()` rejects unknown
 * keys so a non-compliant field is a hard 400 rather than silently dropped.
 */

const ASIN = z.string().regex(/^[A-Z0-9]{10}$/, "ASIN must be 10 uppercase alphanumeric chars");

/** Keys that are forbidden because they imply scraped Amazon data. */
export const FORBIDDEN_PRODUCT_KEYS = [
  "price",
  "currency",
  "rating",
  "reviewCount",
  "reviews",
  "images",
  "imageUrl",
  "amazonImage",
] as const;

const editorialDraftSchema = z
  .object({
    title: z.string().min(3).max(300),
    editorialReview: z.string().min(1).optional(),
    prosCons: z
      .object({
        pros: z.array(z.string()).default([]),
        cons: z.array(z.string()).default([]),
      })
      .optional(),
    editorialRating: z.number().min(0).max(10).optional(),
  })
  .strict();

export const ingestProductSchema = z
  .object({
    asin: ASIN,
    brand: z.string().max(120).optional(),
    category: z.string().max(120).optional(),
    marketplace: z.string().min(3).max(40).default("amazon.com"),
    editorialDraft: editorialDraftSchema,
  })
  .strict();

export const ingestProductsPayloadSchema = z.object({
  products: z.array(ingestProductSchema).min(1).max(500),
});

export const ingestArticleSchema = z
  .object({
    slug: z.string().min(1).max(200),
    type: z.enum(["GUIDE", "COMPARISON", "LISTICLE", "HOWTO", "NEWS"]),
    authorSlug: z.string().min(1).max(120),
    title: z.string().min(3).max(300),
    body: z.string().min(1),
    excerpt: z.string().max(500).optional(),
    productAsins: z.array(ASIN).max(50).default([]),
  })
  .strict();

export const ingestArticlesPayloadSchema = z.object({
  articles: z.array(ingestArticleSchema).min(1).max(200),
});

export type IngestProduct = z.infer<typeof ingestProductSchema>;
export type IngestArticle = z.infer<typeof ingestArticleSchema>;

export interface IngestResult {
  success: boolean;
  created: number;
  updated: number;
  skipped: number;
  errors: Array<{ ref: string; message: string }>;
}
