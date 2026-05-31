import { db } from "@/lib/db";
import type { ProductCardData } from "@/lib/products/queries";

const PUBLISHED = { status: "PUBLISHED" } as const;

export interface ArticleListItem {
  slug: string;
  type: string;
  title: string;
  excerpt: string | null;
  authorName: string;
  authorSlug: string;
  publishedAt: Date | null;
}

const listTranslation = (locale: string) => ({
  where: { locale },
  select: { title: true, excerpt: true },
  take: 1,
});

export async function getPublishedArticles(locale: string, limit = 24): Promise<ArticleListItem[]> {
  const rows = await db.article.findMany({
    where: PUBLISHED,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: limit,
    select: {
      slug: true,
      type: true,
      publishedAt: true,
      author: { select: { name: true, slug: true } },
      translations: listTranslation(locale),
    },
  });
  return rows.map((a) => ({
    slug: a.slug,
    type: a.type,
    title: a.translations[0]?.title ?? a.slug,
    excerpt: a.translations[0]?.excerpt ?? null,
    authorName: a.author.name,
    authorSlug: a.author.slug,
    publishedAt: a.publishedAt,
  }));
}

export async function getArticleBySlug(slug: string, locale: string) {
  const a = await db.article.findFirst({
    where: { slug, ...PUBLISHED },
    include: {
      author: { select: { name: true, slug: true, avatarPath: true } },
      translations: { where: { locale }, take: 1 },
      products: {
        orderBy: { order: "asc" },
        include: {
          product: {
            select: {
              id: true,
              slug: true,
              asin: true,
              brand: true,
              editorialRating: true,
              placeholderKey: true,
              category: { select: { slug: true } },
              translations: { where: { locale }, select: { title: true }, take: 1 },
            },
          },
        },
      },
    },
  });
  if (!a) return null;
  const t = a.translations[0];
  const products: ProductCardData[] = a.products
    .filter((ap) => ap.product != null)
    .map((ap) => ({
      id: ap.product.id,
      slug: ap.product.slug,
      asin: ap.product.asin,
      brand: ap.product.brand,
      title: ap.product.translations[0]?.title ?? ap.product.slug,
      editorialRating: ap.product.editorialRating,
      placeholderKey: ap.product.placeholderKey,
      categorySlug: ap.product.category?.slug ?? null,
    }));
  return {
    slug: a.slug,
    type: a.type,
    title: t?.title ?? a.slug,
    body: t?.body ?? "",
    excerpt: t?.excerpt ?? null,
    metaTitle: t?.metaTitle ?? null,
    metaDescription: t?.metaDescription ?? null,
    publishedAt: a.publishedAt,
    author: a.author,
    products,
  };
}

export async function getAuthorBySlug(slug: string, locale: string) {
  const author = await db.author.findUnique({
    where: { slug },
    include: { translations: { where: { locale }, take: 1 } },
  });
  if (!author) return null;
  const articles = await getAuthorArticles(author.id, locale);
  return {
    name: author.name,
    slug: author.slug,
    avatarPath: author.avatarPath,
    bio: author.translations[0]?.bio ?? null,
    articles,
  };
}

export interface ArticleSitemapEntry {
  slug: string;
  updatedAt: Date;
  publishedAt: Date | null;
}

export async function getPublishedArticleSitemapEntries(): Promise<ArticleSitemapEntry[]> {
  return db.article.findMany({
    where: PUBLISHED,
    select: { slug: true, updatedAt: true, publishedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getAuthorSlugs(): Promise<string[]> {
  const rows = await db.author.findMany({ select: { slug: true } });
  return rows.map((r) => r.slug);
}

async function getAuthorArticles(authorId: string, locale: string): Promise<ArticleListItem[]> {
  const rows = await db.article.findMany({
    where: { authorId, ...PUBLISHED },
    orderBy: [{ publishedAt: "desc" }],
    select: {
      slug: true,
      type: true,
      publishedAt: true,
      author: { select: { name: true, slug: true } },
      translations: listTranslation(locale),
    },
  });
  return rows.map((a) => ({
    slug: a.slug,
    type: a.type,
    title: a.translations[0]?.title ?? a.slug,
    excerpt: a.translations[0]?.excerpt ?? null,
    authorName: a.author.name,
    authorSlug: a.author.slug,
    publishedAt: a.publishedAt,
  }));
}
