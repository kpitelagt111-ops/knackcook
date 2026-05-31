import { describe, expect, it } from "vitest";
import { ingestArticlesPayloadSchema, ingestProductsPayloadSchema } from "./schemas";

const validProduct = {
  asin: "B08XYZ1234",
  brand: "Acme",
  category: "Kitchen",
  marketplace: "amazon.com",
  editorialDraft: {
    title: "Acme Stand Mixer",
    editorialReview: "A rewritten, original editorial take on this mixer.",
    prosCons: { pros: ["Powerful"], cons: ["Heavy"] },
    editorialRating: 8.5,
  },
};

describe("ingestProductsPayloadSchema", () => {
  it("accepts a valid compliant product", () => {
    const res = ingestProductsPayloadSchema.safeParse({ products: [validProduct] });
    expect(res.success).toBe(true);
  });

  it("rejects a scraped price (compliance guardrail)", () => {
    const res = ingestProductsPayloadSchema.safeParse({
      products: [{ ...validProduct, price: 29.99 }],
    });
    expect(res.success).toBe(false);
  });

  it("rejects raw Amazon reviews (compliance guardrail)", () => {
    const res = ingestProductsPayloadSchema.safeParse({
      products: [{ ...validProduct, reviews: [{ author: "John", body: "..." }] }],
    });
    expect(res.success).toBe(false);
  });

  it("rejects an Amazon image url (compliance guardrail)", () => {
    const res = ingestProductsPayloadSchema.safeParse({
      products: [{ ...validProduct, images: ["https://m.media-amazon.com/x.jpg"] }],
    });
    expect(res.success).toBe(false);
  });

  it("rejects an Amazon star rating field (compliance guardrail)", () => {
    const res = ingestProductsPayloadSchema.safeParse({
      products: [{ ...validProduct, rating: 4.3, reviewCount: 1247 }],
    });
    expect(res.success).toBe(false);
  });

  it("rejects a malformed ASIN", () => {
    const res = ingestProductsPayloadSchema.safeParse({
      products: [{ ...validProduct, asin: "too-short" }],
    });
    expect(res.success).toBe(false);
  });

  it("rejects an empty products array", () => {
    const res = ingestProductsPayloadSchema.safeParse({ products: [] });
    expect(res.success).toBe(false);
  });

  it("clamps editorialRating to the 0..10 range", () => {
    const res = ingestProductsPayloadSchema.safeParse({
      products: [
        {
          ...validProduct,
          editorialDraft: { ...validProduct.editorialDraft, editorialRating: 99 },
        },
      ],
    });
    expect(res.success).toBe(false);
  });
});

describe("ingestArticlesPayloadSchema", () => {
  const validArticle = {
    slug: "best-stand-mixers",
    type: "LISTICLE" as const,
    authorSlug: "jane-doe",
    title: "The Best Stand Mixers",
    body: "<p>Original editorial content.</p>",
    productAsins: ["B08XYZ1234"],
  };

  it("accepts a valid article", () => {
    const res = ingestArticlesPayloadSchema.safeParse({ articles: [validArticle] });
    expect(res.success).toBe(true);
  });

  it("rejects an unknown article type", () => {
    const res = ingestArticlesPayloadSchema.safeParse({
      articles: [{ ...validArticle, type: "SPONSORED" }],
    });
    expect(res.success).toBe(false);
  });

  it("rejects unknown extra keys (strict)", () => {
    const res = ingestArticlesPayloadSchema.safeParse({
      articles: [{ ...validArticle, amazonReviewText: "scraped" }],
    });
    expect(res.success).toBe(false);
  });
});
