import { describe, expect, it } from "vitest";
import { checkCompliance } from "./compliance";

describe("checkCompliance — forbidden field keys", () => {
  it("flags a top-level `price` key", () => {
    const res = checkCompliance({ price: 29.99 });
    expect(res.ok).toBe(false);
    expect(res.fields).toContain("price");
  });

  it("flags `aggregateRating` (case-insensitive) deep in the tree", () => {
    const res = checkCompliance({
      products: [{ asin: "B08XYZ1234", AggregateRating: 4.5 }],
    });
    expect(res.ok).toBe(false);
    expect(res.fields.some((f) => f.includes("AggregateRating"))).toBe(true);
  });

  it("flags `customerReviews` and `amazonReview` together", () => {
    const res = checkCompliance({
      customerReviews: [{ body: "x" }],
      amazonReview: "scraped",
    });
    expect(res.ok).toBe(false);
    expect(res.fields.length).toBeGreaterThanOrEqual(2);
  });

  it("does NOT flag the legitimate `marketplace: 'amazon.com'` value", () => {
    const res = checkCompliance({ marketplace: "amazon.com" });
    expect(res.ok).toBe(true);
  });
});

describe("checkCompliance — Amazon URLs", () => {
  it("flags an https Amazon CDN image url anywhere in a string", () => {
    const res = checkCompliance({
      editorialReview: "See https://m.media-amazon.com/images/I/abc.jpg for details.",
    });
    expect(res.ok).toBe(false);
    expect(res.fields.some((f) => f.endsWith(":amazon_url"))).toBe(true);
  });

  it("flags ssl-images-amazon and images-amazon hosts", () => {
    const res = checkCompliance({
      body: "Pic: https://images-amazon.com/x.png and https://ssl-images-amazon.com/y.png",
    });
    expect(res.ok).toBe(false);
  });

  it("flags an amazon.com URL embedded in article body", () => {
    const res = checkCompliance({
      articles: [{ body: "Buy at https://www.amazon.com/dp/B08XYZ1234 today." }],
    });
    expect(res.ok).toBe(false);
  });

  it("flags a protocol-relative amazon image url", () => {
    const res = checkCompliance({
      excerpt: "img: //m.media-amazon.com/I/foo.jpg",
    });
    expect(res.ok).toBe(false);
  });
});

describe("checkCompliance — currency / price strings", () => {
  it("flags $29.99 in editorial text", () => {
    const res = checkCompliance({ editorialReview: "Worth every penny at $29.99." });
    expect(res.ok).toBe(false);
    expect(res.fields.some((f) => f.endsWith(":price_string"))).toBe(true);
  });

  it("flags €19 and £12.50", () => {
    const a = checkCompliance({ body: "Only €19 today" });
    const b = checkCompliance({ body: "Was £12.50" });
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
  });

  it("flags ¥1200 and trailing USD/EUR/GBP/JPY", () => {
    const a = checkCompliance({ body: "¥1200 import" });
    const b = checkCompliance({ body: "Pay 29.99 USD" });
    expect(a.ok).toBe(false);
    expect(b.ok).toBe(false);
  });

  it("does NOT flag harmless numbers without currency", () => {
    const res = checkCompliance({ body: "Holds 12 cups, weighs 5 lbs." });
    expect(res.ok).toBe(true);
  });
});

describe("checkCompliance — clean payloads", () => {
  it("passes a fully compliant product payload", () => {
    const res = checkCompliance({
      products: [
        {
          asin: "B08XYZ1234",
          brand: "Acme",
          marketplace: "amazon.com",
          editorialDraft: {
            title: "Acme Stand Mixer",
            editorialReview: "Our rewritten editorial take.",
            prosCons: { pros: ["Powerful"], cons: ["Heavy"] },
            editorialRating: 8.5,
          },
        },
      ],
    });
    expect(res.ok).toBe(true);
    expect(res.fields).toEqual([]);
  });

  it("passes a fully compliant article payload", () => {
    const res = checkCompliance({
      articles: [
        {
          slug: "best-stand-mixers",
          type: "LISTICLE",
          authorSlug: "jane-doe",
          title: "The Best Stand Mixers",
          body: "<p>Original editorial content. No prices, no Amazon URLs.</p>",
          productAsins: ["B08XYZ1234"],
        },
      ],
    });
    expect(res.ok).toBe(true);
  });
});
