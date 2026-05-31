import { db } from "@/lib/db";

const PUBLISHED = { status: "PUBLISHED", isActive: true } as const;

export interface ProductCardData {
  id: string;
  slug: string;
  asin: string;
  brand: string | null;
  title: string;
  editorialRating: number | null;
  placeholderKey: string | null;
  categorySlug: string | null;
}

function toCard(p: {
  id: string;
  slug: string;
  asin: string;
  brand: string | null;
  editorialRating: number | null;
  placeholderKey: string | null;
  category: { slug: string } | null;
  translations: { title: string }[];
}): ProductCardData {
  return {
    id: p.id,
    slug: p.slug,
    asin: p.asin,
    brand: p.brand,
    title: p.translations[0]?.title ?? p.slug,
    editorialRating: p.editorialRating,
    placeholderKey: p.placeholderKey,
    categorySlug: p.category?.slug ?? null,
  };
}

const cardSelect = (locale: string) => ({
  id: true,
  slug: true,
  asin: true,
  brand: true,
  editorialRating: true,
  placeholderKey: true,
  category: { select: { slug: true } },
  translations: { where: { locale }, select: { title: true }, take: 1 },
});

export async function getPublishedProducts(locale: string, limit = 24): Promise<ProductCardData[]> {
  const rows = await db.product.findMany({
    where: PUBLISHED,
    orderBy: [{ popularity: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: cardSelect(locale),
  });
  return rows.map(toCard);
}

export async function getProductBySlug(slug: string, locale: string) {
  const p = await db.product.findFirst({
    where: { slug, ...PUBLISHED },
    include: {
      category: { select: { slug: true, translations: { where: { locale }, take: 1 } } },
      translations: { where: { locale }, take: 1 },
      images: { orderBy: { order: "asc" } },
    },
  });
  if (!p) return null;
  const t = p.translations[0];
  const prosCons = (p.prosCons ?? null) as { pros?: string[]; cons?: string[] } | null;
  return {
    id: p.id,
    asin: p.asin,
    slug: p.slug,
    brand: p.brand,
    marketplace: p.marketplace,
    title: t?.title ?? p.slug,
    editorialReview: t?.editorialReview ?? p.editorialReview,
    editorialRating: p.editorialRating,
    pros: prosCons?.pros ?? [],
    cons: prosCons?.cons ?? [],
    metaTitle: t?.metaTitle ?? p.metaTitle,
    metaDescription: t?.metaDescription ?? p.metaDescription,
    placeholderKey: p.placeholderKey,
    categorySlug: p.category?.slug ?? null,
    categoryName: p.category?.translations[0]?.name ?? null,
    images: p.images.map((i) => ({ path: i.path, alt: i.alt })),
  };
}

export async function getProductsBySlugs(
  slugs: string[],
  locale: string,
): Promise<ProductCardData[]> {
  if (slugs.length === 0) return [];
  const rows = await db.product.findMany({
    where: { ...PUBLISHED, slug: { in: slugs } },
    select: cardSelect(locale),
  });
  const cards = rows.map(toCard);
  const order = new Map(slugs.map((s, i) => [s, i] as const));
  return cards.sort((a, b) => (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0));
}

export async function getRelatedProducts(
  categorySlug: string | null,
  excludeId: string,
  locale: string,
  limit = 4,
): Promise<ProductCardData[]> {
  if (!categorySlug) return [];
  const rows = await db.product.findMany({
    where: { ...PUBLISHED, id: { not: excludeId }, category: { slug: categorySlug } },
    take: limit,
    select: cardSelect(locale),
  });
  return rows.map(toCard);
}

export async function getProductsByCategory(categorySlug: string, locale: string, limit = 24) {
  const rows = await db.product.findMany({
    where: { ...PUBLISHED, category: { slug: categorySlug } },
    orderBy: [{ popularity: "desc" }, { updatedAt: "desc" }],
    take: limit,
    select: cardSelect(locale),
  });
  return rows.map(toCard);
}

export async function getCategories(locale: string) {
  return db.category.findMany({
    orderBy: { order: "asc" },
    select: { slug: true, translations: { where: { locale }, select: { name: true }, take: 1 } },
  });
}

export async function getAllPublishedSlugs(): Promise<string[]> {
  const rows = await db.product.findMany({ where: PUBLISHED, select: { slug: true } });
  return rows.map((r) => r.slug);
}

export interface SitemapEntry {
  slug: string;
  updatedAt: Date;
}

export async function getPublishedProductSitemapEntries(): Promise<SitemapEntry[]> {
  return db.product.findMany({
    where: PUBLISHED,
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getCategorySlugs(): Promise<string[]> {
  const rows = await db.category.findMany({ select: { slug: true } });
  return rows.map((r) => r.slug);
}

// Meilisearch (typo-tolerant) with a Postgres fallback if the engine is down.
export async function searchProducts(
  query: string,
  locale: string,
  limit = 24,
): Promise<ProductCardData[]> {
  if (!query.trim()) return [];
  try {
    const { searchProductsMeili } = await import("@/lib/search/meili");
    const hits = await searchProductsMeili(query, limit);
    return hits.map((h) => ({
      id: h.id,
      slug: h.slug,
      asin: h.asin,
      brand: h.brand,
      title: h.title,
      editorialRating: h.editorialRating,
      placeholderKey: h.placeholderKey,
      categorySlug: h.categorySlug,
    }));
  } catch {
    const rows = await db.product.findMany({
      where: {
        ...PUBLISHED,
        translations: { some: { locale, title: { contains: query, mode: "insensitive" } } },
      },
      take: limit,
      select: cardSelect(locale),
    });
    return rows.map(toCard);
  }
}
