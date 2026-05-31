import type { PrismaClient } from "@prisma/client";
import { slugify } from "@/lib/utils/slug";
import type { IngestArticle, IngestResult } from "./schemas";

/**
 * Upsert ingested article drafts by slug (REQ-I-06). Source = AI_DRAFT,
 * status = DRAFT. Editors approve/publish from the back office. Links any
 * referenced products (M2M) that already exist; unknown ASINs are ignored.
 */
export async function ingestArticles(
  db: PrismaClient,
  articles: IngestArticle[],
): Promise<IngestResult> {
  const result: IngestResult = {
    success: true,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  for (const a of articles) {
    try {
      const authorId = await ensureAuthor(db, a.authorSlug);
      const productLinks = await resolveProductLinks(db, a.productAsins);

      const existing = await db.article.findUnique({
        where: { slug: a.slug },
        select: { id: true },
      });

      if (existing) {
        await db.article.update({
          where: { slug: a.slug },
          data: {
            type: a.type,
            authorId,
            translations: {
              upsert: {
                where: { articleId_locale: { articleId: existing.id, locale: "en" } },
                create: {
                  locale: "en",
                  title: a.title,
                  body: a.body,
                  excerpt: a.excerpt,
                  slug: a.slug,
                },
                update: { title: a.title, body: a.body, excerpt: a.excerpt },
              },
            },
          },
        });
        result.updated += 1;
      } else {
        await db.article.create({
          data: {
            slug: a.slug,
            type: a.type,
            status: "DRAFT",
            source: "AI_DRAFT",
            authorId,
            translations: {
              create: {
                locale: "en",
                title: a.title,
                body: a.body,
                excerpt: a.excerpt,
                slug: a.slug,
              },
            },
            products: productLinks.length
              ? {
                  create: productLinks.map((productId, i) => ({
                    productId,
                    role: "card",
                    order: i,
                  })),
                }
              : undefined,
          },
        });
        result.created += 1;
      }
    } catch (err) {
      result.skipped += 1;
      result.errors.push({
        ref: a.slug,
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

async function ensureAuthor(db: PrismaClient, authorSlug: string): Promise<string> {
  const slug = slugify(authorSlug);
  const existing = await db.author.findUnique({ where: { slug }, select: { id: true } });
  if (existing) return existing.id;
  const created = await db.author.create({
    data: { slug, name: authorSlug },
    select: { id: true },
  });
  return created.id;
}

async function resolveProductLinks(db: PrismaClient, asins: string[]): Promise<string[]> {
  if (!asins.length) return [];
  const found = await db.product.findMany({
    where: { asin: { in: asins } },
    select: { id: true },
  });
  return found.map((p) => p.id);
}
