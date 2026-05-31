import type { PrismaClient } from "@prisma/client";
import { slugify } from "@/lib/utils/slug";
import type { IngestProduct, IngestResult } from "./schemas";

/**
 * Upsert ingested products by ASIN. Idempotent (REQ-I-02/03).
 * New products enter DRAFT and isActive=false — they are NOT published until
 * an editor approves them in the back office (REQ-I-04).
 *
 * Compliance: only editorial (rewritten) fields are stored. No Amazon
 * price/review/image ever reaches the DB (enforced upstream by the Zod schema).
 */
export async function ingestProducts(
  db: PrismaClient,
  products: IngestProduct[],
): Promise<IngestResult> {
  const result: IngestResult = {
    success: true,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const p of products) {
    try {
      const categoryId = p.category ? await ensureCategory(db, p.category) : null;

      const existing = await db.product.findUnique({
        where: { asin: p.asin },
        select: { id: true },
      });

      const editorial = p.editorialDraft;

      if (existing) {
        await db.product.update({
          where: { asin: p.asin },
          data: {
            brand: p.brand,
            marketplace: p.marketplace,
            categoryId,
            editorialReview: editorial.editorialReview,
            editorialRating: editorial.editorialRating,
            prosCons: editorial.prosCons ?? undefined,
            // status / isActive / slug are NOT overwritten — editor owns them.
          },
        });
        result.updated += 1;
      } else {
        const slug = await uniqueProductSlug(db, editorial.title, p.asin);
        await db.product.create({
          data: {
            asin: p.asin,
            slug,
            brand: p.brand,
            marketplace: p.marketplace,
            categoryId,
            status: "DRAFT",
            isActive: false,
            editorialReview: editorial.editorialReview,
            editorialRating: editorial.editorialRating,
            prosCons: editorial.prosCons ?? undefined,
            translations: {
              create: {
                locale: "en",
                title: editorial.title,
                editorialReview: editorial.editorialReview,
                slug,
              },
            },
          },
        });
        result.created += 1;
      }
    } catch (err) {
      result.skipped += 1;
      result.errors.push({
        ref: p.asin,
        message: err instanceof Error ? err.message : "unknown error",
      });
    }
  }

  await db.syncLog.create({
    data: {
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      errors: result.errors.length ? result.errors : undefined,
    },
  });

  result.success = result.errors.length === 0;
  return result;
}

async function ensureCategory(db: PrismaClient, name: string): Promise<string> {
  const slug = slugify(name);
  const existing = await db.category.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (existing) return existing.id;
  const created = await db.category.create({
    data: {
      slug,
      translations: { create: { locale: "en", name, slug } },
    },
    select: { id: true },
  });
  return created.id;
}

async function uniqueProductSlug(db: PrismaClient, title: string, asin: string): Promise<string> {
  const base = slugify(title) || asin.toLowerCase();
  let candidate = base;
  let i = 1;
  while (await db.product.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    candidate = `${base}-${i}`;
    i += 1;
    if (i > 50) {
      candidate = `${base}-${asin.toLowerCase()}`;
      break;
    }
  }
  return candidate;
}
