/**
 * Unit tests for ingestArticles product-linking behaviour.
 *
 * Focus: re-ingesting an existing article must (re)link its referenced
 * products as cards, in the ASIN order they were sent — so a roundup
 * published before its products existed can attach them on a later run.
 */
import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { ingestArticles } from "./articles-service";

const ASIN_1 = "B0000000B1";
const ASIN_2 = "B0000000B2";

/**
 * Hand-rolled Prisma mock. product.findMany deliberately returns the two
 * products in REVERSE of the payload order, to prove the service re-sorts
 * back to the sent order rather than trusting the DB's order.
 */
function makeDb(existing: { id: string } | null) {
  const articleProductUpsert = vi.fn().mockResolvedValue({});
  const articleCreate = vi.fn().mockResolvedValue({ id: "art1" });
  const db = {
    author: {
      findUnique: vi.fn().mockResolvedValue({ id: "author1" }),
      create: vi.fn().mockResolvedValue({ id: "author1" }),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([
        { id: "p2", asin: ASIN_2 },
        { id: "p1", asin: ASIN_1 },
      ]),
    },
    article: {
      findUnique: vi.fn().mockResolvedValue(existing),
      update: vi.fn().mockResolvedValue({ id: "art1" }),
      create: articleCreate,
    },
    articleProduct: { upsert: articleProductUpsert },
    syncLog: { create: vi.fn().mockResolvedValue({}) },
  };
  return { db, articleProductUpsert, articleCreate };
}

const baseArticle = {
  slug: "best-cast-iron-skillets-2026",
  type: "LISTICLE" as const,
  authorSlug: "marlowe-finch",
  title: "The Best Cast Iron Skillets",
  body: "<p>Original editorial content.</p>",
  productAsins: [ASIN_1, ASIN_2],
};

describe("ingestArticles product linking", () => {
  it("re-links products on update, preserving the sent ASIN order", async () => {
    const { db, articleProductUpsert } = makeDb({ id: "art1" });

    const result = await ingestArticles(db as unknown as PrismaClient, [baseArticle]);

    expect(result.updated).toBe(1);
    expect(result.created).toBe(0);
    expect(articleProductUpsert).toHaveBeenCalledTimes(2);

    // Payload order [ASIN_1, ASIN_2] -> [p1 (order 0), p2 (order 1)],
    // NOT the DB's findMany order [p2, p1].
    const firstCall = articleProductUpsert.mock.calls[0]?.[0];
    const secondCall = articleProductUpsert.mock.calls[1]?.[0];
    expect(firstCall?.create).toMatchObject({ productId: "p1", role: "card", order: 0 });
    expect(secondCall?.create).toMatchObject({ productId: "p2", role: "card", order: 1 });
  });

  it("links products on create in the sent ASIN order", async () => {
    const { db, articleCreate } = makeDb(null);

    const result = await ingestArticles(db as unknown as PrismaClient, [baseArticle]);

    expect(result.created).toBe(1);
    const createArg = articleCreate.mock.calls[0]?.[0];
    const links = (createArg?.data?.products?.create ?? []) as Array<{
      productId: string;
      order: number;
    }>;
    expect(links.map((l) => l.productId)).toEqual(["p1", "p2"]);
  });

  it("does not touch articleProduct when no ASINs are sent", async () => {
    const { db, articleProductUpsert } = makeDb({ id: "art1" });

    await ingestArticles(db as unknown as PrismaClient, [{ ...baseArticle, productAsins: [] }]);

    expect(articleProductUpsert).not.toHaveBeenCalled();
  });
});
