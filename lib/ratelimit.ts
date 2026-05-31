/**
 * Token-bucket rate limiter for HTTP boundaries (ingest, newsletter).
 *
 * Storage: process-local Map. Good enough for a single-VPS deployment.
 * TODO(redis): swap the Map for a Redis-backed implementation once
 * `lib/redis.ts` exists (multi-instance / horizontal scale).
 *
 * Keys are caller-defined (typically `${authToken || ip}:${routeId}`).
 */

interface Bucket {
  tokens: number;
  updatedAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Maximum burst capacity (and starting tokens). */
  capacity: number;
  /** Refill rate, in tokens per second. */
  refillPerSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the next token is available; 0 when allowed. */
  retryAfter: number;
}

/** Try to consume one token for `key`. Pure function in tests via {@link resetRateLimit}. */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket: Bucket = existing
    ? refill(existing, now, opts)
    : { tokens: opts.capacity, updatedAt: now };

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfter: 0 };
  }

  buckets.set(key, bucket);
  const retryAfter = Math.max(1, Math.ceil((1 - bucket.tokens) / opts.refillPerSec));
  return { allowed: false, remaining: 0, retryAfter };
}

function refill(bucket: Bucket, now: number, opts: RateLimitOptions): Bucket {
  const elapsedSec = (now - bucket.updatedAt) / 1000;
  return {
    tokens: Math.min(opts.capacity, bucket.tokens + elapsedSec * opts.refillPerSec),
    updatedAt: now,
  };
}

/** Test helper — wipe state between cases. Never call from app code. */
export function resetRateLimit(): void {
  buckets.clear();
}

/** Best-effort client IP from standard proxy headers. */
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Bearer token extracted from an `Authorization` header, if present. */
export function bearerToken(authHeader: string | null): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

/** Per-request key: prefer the auth token (per-tenant), fall back to IP. */
export function rateLimitKey(req: Request, routeId: string): string {
  const id = bearerToken(req.headers.get("authorization")) ?? clientIp(req.headers);
  return `${routeId}:${id}`;
}

// ── Presets ──────────────────────────────────────────────────────────────────

/** Ingest endpoints — n8n is the legit caller. 60/min burst, ~60/min sustained. */
export const INGEST_LIMIT: RateLimitOptions = { capacity: 60, refillPerSec: 1 };

/** Newsletter — public form, abuse-prone. 5/min burst per IP. */
export const NEWSLETTER_LIMIT: RateLimitOptions = {
  capacity: 5,
  refillPerSec: 5 / 60,
};
