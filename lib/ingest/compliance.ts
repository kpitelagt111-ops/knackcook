/**
 * Deep compliance scanner for ingestion payloads (AGENTS.md §2).
 *
 * Hard-rejects any payload that carries Amazon-owned display data:
 *   - forbidden field names anywhere in the tree (price, rating, reviews, …)
 *   - Amazon-hosted URLs (amazon.com, *-amazon image CDNs) inside any string
 *   - currency-prefixed numeric strings ($29.99, €19, …) anywhere
 *
 * Runs BEFORE Zod parsing so the API returns a dedicated 422
 * `{ error: "compliance_violation", fields }`. Zod still enforces shape.
 */

/** Field names that imply scraped/copied Amazon data. Compared case-insensitively. */
const FORBIDDEN_KEYS = new Set<string>([
  "price",
  "currency",
  "rating",
  "reviewcount",
  "reviews",
  "review",
  "images",
  "imageurl",
  "amazonimage",
  "amazonreview",
  "amazonrating",
  "aggregaterating",
  "customerreviews",
  "stars",
  "starrating",
]);

/**
 * Matches Amazon URLs only (must have a scheme or protocol-relative prefix)
 * so legitimate values like `marketplace: "amazon.com"` are NOT flagged.
 */
const AMAZON_URL_RE =
  /(?:https?:)?\/\/[^\s'"<>]*(?:amazon\.com|images-amazon|media-amazon|ssl-images-amazon)/i;

/**
 * Currency-prefixed or suffixed numeric "price" strings, e.g.
 *   "$29.99"  "€ 19"  "£12.50"  "¥1200"  "29.99 USD"  "19 EUR"
 */
const PRICE_RE = /(?:[$€£¥]\s?\d|\b\d+(?:[.,]\d{1,2})?\s?(?:USD|EUR|GBP|JPY)\b)/i;

export interface ComplianceResult {
  ok: boolean;
  /** Dotted paths to the offending nodes (e.g. `products[0].price`). */
  fields: string[];
}

/** Scan an arbitrary JSON-like payload and report compliance violations. */
export function checkCompliance(payload: unknown): ComplianceResult {
  const violations = new Set<string>();
  walk(payload, "", violations);
  return { ok: violations.size === 0, fields: Array.from(violations) };
}

function walk(node: unknown, path: string, out: Set<string>): void {
  if (node === null || node === undefined) return;

  if (typeof node === "string") {
    if (AMAZON_URL_RE.test(node)) out.add(`${path || "$"}:amazon_url`);
    if (PRICE_RE.test(node)) out.add(`${path || "$"}:price_string`);
    return;
  }

  if (typeof node !== "object") return;

  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      walk(node[i], `${path}[${i}]`, out);
    }
    return;
  }

  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (FORBIDDEN_KEYS.has(key.toLowerCase())) {
      out.add(path ? `${path}.${key}` : key);
    }
    walk(value, path ? `${path}.${key}` : key, out);
  }
}
