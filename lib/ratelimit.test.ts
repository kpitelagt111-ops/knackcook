import { beforeEach, describe, expect, it } from "vitest";
import {
  bearerToken,
  clientIp,
  INGEST_LIMIT,
  NEWSLETTER_LIMIT,
  rateLimit,
  rateLimitKey,
  resetRateLimit,
} from "./ratelimit";

beforeEach(() => {
  resetRateLimit();
});

describe("rateLimit — token bucket", () => {
  it("allows requests up to capacity then 429s", () => {
    const opts = { capacity: 3, refillPerSec: 0.0001 };
    expect(rateLimit("k", opts).allowed).toBe(true);
    expect(rateLimit("k", opts).allowed).toBe(true);
    expect(rateLimit("k", opts).allowed).toBe(true);
    const fourth = rateLimit("k", opts);
    expect(fourth.allowed).toBe(false);
    expect(fourth.retryAfter).toBeGreaterThan(0);
  });

  it("isolates buckets per key", () => {
    const opts = { capacity: 1, refillPerSec: 0.0001 };
    expect(rateLimit("a", opts).allowed).toBe(true);
    expect(rateLimit("a", opts).allowed).toBe(false);
    expect(rateLimit("b", opts).allowed).toBe(true);
  });

  it("refills over time", async () => {
    // refillPerSec: 10 -> 1 token every 100ms. Slow enough that two
    // synchronous calls cannot refill (CI inter-call latency << 100ms),
    // and 150ms wait guarantees at least one refilled token.
    const opts = { capacity: 1, refillPerSec: 10 };
    expect(rateLimit("r", opts).allowed).toBe(true);
    expect(rateLimit("r", opts).allowed).toBe(false);
    await new Promise((r) => setTimeout(r, 150));
    expect(rateLimit("r", opts).allowed).toBe(true);
  });
});

describe("rateLimitKey + helpers", () => {
  it("prefers Bearer token over IP", () => {
    const req = new Request("http://x/y", {
      headers: { authorization: "Bearer abc123", "x-forwarded-for": "1.2.3.4" },
    });
    expect(rateLimitKey(req, "r")).toBe("r:abc123");
  });

  it("falls back to x-forwarded-for when no auth", () => {
    const req = new Request("http://x/y", {
      headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" },
    });
    expect(rateLimitKey(req, "r")).toBe("r:9.9.9.9");
  });

  it("returns `unknown` when no IP headers", () => {
    const req = new Request("http://x/y");
    expect(clientIp(req.headers)).toBe("unknown");
  });

  it("bearerToken parses or returns null", () => {
    expect(bearerToken("Bearer xyz")).toBe("xyz");
    expect(bearerToken("xyz")).toBeNull();
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken("Bearer ")).toBeNull();
  });

  it("preset NEWSLETTER_LIMIT is the documented 5/min", () => {
    expect(NEWSLETTER_LIMIT.capacity).toBe(5);
    expect(NEWSLETTER_LIMIT.refillPerSec).toBeCloseTo(5 / 60, 5);
    // INGEST is 60/min burst
    expect(INGEST_LIMIT.capacity).toBe(60);
  });
});
