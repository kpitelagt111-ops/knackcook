/**
 * Route-handler integration tests for the ingestion + newsletter boundary.
 * We mock data-access (Prisma, Meili, Next cache) and exercise the real
 * auth, compliance, rate-limit, and Zod pipeline.
 */
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimit } from "@/lib/ratelimit";

// ── Module mocks (hoisted) ───────────────────────────────────────────────────
vi.mock("@/lib/db", () => ({
  db: {
    subscriber: {
      findUnique: vi.fn().mockResolvedValue(null),
      upsert: vi.fn().mockResolvedValue({ id: "sub_1" }),
    },
  },
}));

vi.mock("@/lib/ingest/service", () => ({
  ingestProducts: vi.fn().mockResolvedValue({
    success: true,
    created: 1,
    updated: 0,
    skipped: 0,
    errors: [],
  }),
}));

vi.mock("@/lib/ingest/articles-service", () => ({
  ingestArticles: vi.fn().mockResolvedValue({
    success: true,
    created: 1,
    updated: 0,
    skipped: 0,
    errors: [],
  }),
}));

vi.mock("@/lib/search/meili", () => ({
  reindexProducts: vi.fn().mockResolvedValue(7),
}));

vi.mock("@/lib/revalidate", () => ({
  revalidateProducts: vi.fn(),
  revalidateArticles: vi.fn(),
}));

const TEST_KEY = "test-ingest-key-1234567890";

beforeAll(() => {
  process.env.INGEST_API_KEY = TEST_KEY;
});

beforeEach(() => {
  resetRateLimit();
});

// Import the route handlers AFTER mocks are declared (vi.mock is hoisted, so
// this is safe at top-level too, but explicit dynamic imports keep intent clear).
const productsRoute = await import("@/app/api/ingest/products/route");
const articlesRoute = await import("@/app/api/ingest/articles/route");
const reindexRoute = await import("@/app/api/ingest/reindex/route");
const newsletterRoute = await import("@/app/api/newsletter/route");

function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${TEST_KEY}`,
    "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250) + 1}`,
    ...extra,
  };
}

function makeRequest(
  url: string,
  init: { headers?: Record<string, string>; body?: unknown; method?: string } = {},
): Request {
  return new Request(url, {
    method: init.method ?? "POST",
    headers: init.headers ?? { "content-type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

const validProduct = {
  asin: "B08XYZ1234",
  brand: "Acme",
  category: "Kitchen",
  marketplace: "amazon.com",
  editorialDraft: {
    title: "Acme Stand Mixer",
    editorialReview: "A rewritten original editorial take on this mixer.",
    prosCons: { pros: ["Powerful"], cons: ["Heavy"] },
    editorialRating: 8.5,
  },
};

const validArticle = {
  slug: "best-stand-mixers",
  type: "LISTICLE" as const,
  authorSlug: "jane-doe",
  title: "The Best Stand Mixers",
  body: "<p>Original editorial content with zero Amazon links or prices.</p>",
  productAsins: ["B08XYZ1234"],
};

// ── /api/ingest/products ────────────────────────────────────────────────────
describe("POST /api/ingest/products", () => {
  it("401 without Bearer", async () => {
    const res = await productsRoute.POST(
      makeRequest("http://x/api/ingest/products", {
        headers: { "content-type": "application/json" },
        body: { products: [validProduct] },
      }) as never,
    );
    expect(res.status).toBe(401);
  });

  it("200 on a clean payload", async () => {
    const res = await productsRoute.POST(
      makeRequest("http://x/api/ingest/products", {
        headers: authHeaders(),
        body: { products: [validProduct] },
      }) as never,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("422 compliance_violation on scraped price field", async () => {
    const res = await productsRoute.POST(
      makeRequest("http://x/api/ingest/products", {
        headers: authHeaders(),
        body: { products: [{ ...validProduct, price: 29.99 }] },
      }) as never,
    );
    expect(res.status).toBe(422);
    const json = await res.json();
    expect(json.error).toBe("compliance_violation");
    expect(json.fields.length).toBeGreaterThan(0);
  });

  it("422 on an Amazon image URL embedded in editorialReview", async () => {
    const payload = {
      products: [
        {
          ...validProduct,
          editorialDraft: {
            ...validProduct.editorialDraft,
            editorialReview: "Check the photo at https://m.media-amazon.com/images/I/x.jpg here.",
          },
        },
      ],
    };
    const res = await productsRoute.POST(
      makeRequest("http://x/api/ingest/products", {
        headers: authHeaders(),
        body: payload,
      }) as never,
    );
    expect(res.status).toBe(422);
  });

  it("422 on a $-prefixed price string inside the body", async () => {
    const payload = {
      products: [
        {
          ...validProduct,
          editorialDraft: {
            ...validProduct.editorialDraft,
            editorialReview: "Currently $29.99 but feels premium.",
          },
        },
      ],
    };
    const res = await productsRoute.POST(
      makeRequest("http://x/api/ingest/products", {
        headers: authHeaders(),
        body: payload,
      }) as never,
    );
    expect(res.status).toBe(422);
  });

  it("400 on malformed JSON", async () => {
    const req = new Request("http://x/api/ingest/products", {
      method: "POST",
      headers: authHeaders(),
      body: "{not json",
    });
    const res = await productsRoute.POST(req as never);
    expect(res.status).toBe(400);
  });

  it("400 on a Zod shape violation that is NOT a compliance issue (bad ASIN)", async () => {
    const res = await productsRoute.POST(
      makeRequest("http://x/api/ingest/products", {
        headers: authHeaders(),
        body: { products: [{ ...validProduct, asin: "too-short" }] },
      }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("429 after exceeding the per-token burst", async () => {
    const headers = authHeaders();
    // INGEST_LIMIT.capacity is 60; fire 61 with the same token+IP.
    let last: Response | undefined;
    for (let i = 0; i < 61; i++) {
      last = (await productsRoute.POST(
        makeRequest("http://x/api/ingest/products", {
          headers,
          body: { products: [validProduct] },
        }) as never,
      )) as Response;
    }
    expect(last?.status).toBe(429);
    expect(last?.headers.get("Retry-After")).toBeTruthy();
  });
});

// ── /api/ingest/articles ────────────────────────────────────────────────────
describe("POST /api/ingest/articles", () => {
  it("200 on a clean article payload", async () => {
    const res = await articlesRoute.POST(
      makeRequest("http://x/api/ingest/articles", {
        headers: authHeaders(),
        body: { articles: [validArticle] },
      }) as never,
    );
    expect(res.status).toBe(200);
  });

  it("422 when body embeds an amazon.com product URL", async () => {
    const res = await articlesRoute.POST(
      makeRequest("http://x/api/ingest/articles", {
        headers: authHeaders(),
        body: {
          articles: [{ ...validArticle, body: "Buy at https://www.amazon.com/dp/B08XYZ1234 now." }],
        },
      }) as never,
    );
    expect(res.status).toBe(422);
  });

  it("401 without Bearer", async () => {
    const res = await articlesRoute.POST(
      makeRequest("http://x/api/ingest/articles", {
        headers: { "content-type": "application/json" },
        body: { articles: [validArticle] },
      }) as never,
    );
    expect(res.status).toBe(401);
  });
});

// ── /api/ingest/reindex ─────────────────────────────────────────────────────
describe("POST /api/ingest/reindex", () => {
  it("401 without Bearer", async () => {
    const res = await reindexRoute.POST(
      makeRequest("http://x/api/ingest/reindex", {
        headers: { "content-type": "application/json" },
      }) as never,
    );
    expect(res.status).toBe(401);
  });

  it("200 with indexed count on success", async () => {
    const res = await reindexRoute.POST(
      makeRequest("http://x/api/ingest/reindex", { headers: authHeaders() }) as never,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.indexed).toBe(7);
  });
});

// ── /api/newsletter ─────────────────────────────────────────────────────────
describe("POST /api/newsletter", () => {
  it("200 pending on a valid email", async () => {
    const res = await newsletterRoute.POST(
      makeRequest("http://x/api/newsletter", {
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "8.8.8.8",
        },
        body: { email: "user@example.com", locale: "en" },
      }) as never,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("pending");
  });

  it("400 on an invalid email", async () => {
    const res = await newsletterRoute.POST(
      makeRequest("http://x/api/newsletter", {
        headers: {
          "content-type": "application/json",
          "x-forwarded-for": "8.8.8.9",
        },
        body: { email: "not-an-email" },
      }) as never,
    );
    expect(res.status).toBe(400);
  });

  it("429 after 5 requests/min from the same IP", async () => {
    const headers = {
      "content-type": "application/json",
      "x-forwarded-for": "1.1.1.1",
    };
    let last: Response | undefined;
    for (let i = 0; i < 6; i++) {
      last = (await newsletterRoute.POST(
        makeRequest("http://x/api/newsletter", {
          headers,
          body: { email: `u${i}@example.com` },
        }) as never,
      )) as Response;
    }
    expect(last?.status).toBe(429);
  });
});
