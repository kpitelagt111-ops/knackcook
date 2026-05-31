import { expect, test } from "@playwright/test";

/**
 * SEO surface: dynamic sitemap.xml + per-page JSON-LD.
 *
 * Compliance reminder (AGENTS.md §2.4): product JSON-LD MUST use Schema.org
 * `Review` with our editorial rating, NEVER `AggregateRating` based on Amazon
 * data. This test enforces that invariant.
 */

interface JsonLdNode {
  "@context"?: string;
  "@type"?: string | string[];
  [key: string]: unknown;
}

async function extractJsonLd(page: import("@playwright/test").Page): Promise<JsonLdNode[]> {
  const blobs = await page.locator('script[type="application/ld+json"]').allTextContents();
  const out: JsonLdNode[] = [];
  for (const b of blobs) {
    try {
      const parsed: unknown = JSON.parse(b);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && typeof item === "object") out.push(item as JsonLdNode);
        }
      } else if (parsed && typeof parsed === "object") {
        out.push(parsed as JsonLdNode);
      }
    } catch {
      // Skip malformed nodes — assertions below will catch missing types.
    }
  }
  return out;
}

function hasType(node: JsonLdNode, type: string): boolean {
  const t = node["@type"];
  if (typeof t === "string") return t === type;
  if (Array.isArray(t)) return t.includes(type);
  return false;
}

test.describe("sitemap.xml", () => {
  test("returns valid XML with home, product and blog entries and ISO lastmod dates", async ({
    request,
  }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.status()).toBe(200);
    const contentType = response.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/xml/i);

    const body = await response.text();
    expect(body).toContain("<urlset");
    expect(body).toContain("</urlset>");

    // Homepage entry (locale-prefixed).
    expect(body).toMatch(/<loc>[^<]*\/en<\/loc>/);

    // At least one published product URL.
    const productLocMatch = body.match(/<loc>[^<]*\/en\/products\/[a-z0-9-]+<\/loc>/i);
    expect(productLocMatch, "sitemap should list at least one published product").not.toBeNull();

    // At least one published blog article URL.
    const blogLocMatch = body.match(/<loc>[^<]*\/en\/blog\/[a-z0-9-]+<\/loc>/i);
    expect(blogLocMatch, "sitemap should list at least one published article").not.toBeNull();

    // Every <lastmod> entry parses as a valid Date.
    const lastmods = [...body.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);
    expect(lastmods.length).toBeGreaterThan(0);
    for (const v of lastmods) {
      expect(Number.isNaN(Date.parse(v)), `invalid <lastmod> date: ${v}`).toBe(false);
    }
  });
});

test.describe("JSON-LD on product page", () => {
  test("product page emits Product + Review (editorial rating) and BreadcrumbList — no AggregateRating", async ({
    page,
  }) => {
    const response = await page.goto("/en/products/artisancraft-compactpro-hand-mixer");
    expect(response?.status()).toBeLessThan(400);

    const nodes = await extractJsonLd(page);
    expect(nodes.length, "expected at least one JSON-LD script").toBeGreaterThan(0);

    const product = nodes.find((n) => hasType(n, "Product"));
    expect(product, "Product JSON-LD missing").toBeDefined();

    // Compliance: editorial Review must be present and AggregateRating absent.
    const review = product?.review as JsonLdNode | undefined;
    expect(review, "Review subgraph missing").toBeDefined();
    expect(hasType(review as JsonLdNode, "Review")).toBe(true);

    const rating = (review as JsonLdNode).reviewRating as JsonLdNode | undefined;
    expect(rating, "reviewRating missing").toBeDefined();
    expect((rating as JsonLdNode).bestRating).toBe(10);

    // AGENTS.md §2.4 — never AggregateRating from Amazon data.
    const hasAggregate = nodes.some((n) => hasType(n, "AggregateRating"));
    expect(hasAggregate, "AggregateRating is forbidden per AGENTS.md §2.4").toBe(false);

    // Breadcrumb component emits a BreadcrumbList graph.
    const crumbs = nodes.find((n) => hasType(n, "BreadcrumbList"));
    expect(crumbs, "BreadcrumbList JSON-LD missing").toBeDefined();
  });
});

test.describe("JSON-LD on blog article", () => {
  test("blog article emits Article (with Person author) + BreadcrumbList", async ({ page }) => {
    const response = await page.goto("/en/blog/best-stand-mixers-2026");
    expect(response?.status()).toBeLessThan(400);

    const nodes = await extractJsonLd(page);
    expect(nodes.length).toBeGreaterThan(0);

    const article = nodes.find((n) => hasType(n, "Article"));
    expect(article, "Article JSON-LD missing").toBeDefined();

    const author = (article as JsonLdNode).author as JsonLdNode | undefined;
    expect(author, "Article author missing").toBeDefined();
    expect(hasType(author as JsonLdNode, "Person")).toBe(true);
    expect(typeof (author as JsonLdNode).name).toBe("string");

    const crumbs = nodes.find((n) => hasType(n, "BreadcrumbList"));
    expect(crumbs, "BreadcrumbList JSON-LD missing on blog article").toBeDefined();
  });
});
