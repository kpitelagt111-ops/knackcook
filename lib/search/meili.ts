import { Meilisearch } from "meilisearch";
import { db } from "@/lib/db";

const PRODUCTS_INDEX = "products";

let client: Meilisearch | null = null;

function getClient(): Meilisearch {
  if (!client) {
    client = new Meilisearch({
      host: process.env.MEILISEARCH_HOST ?? "http://127.0.0.1:7700",
      apiKey: process.env.MEILISEARCH_MASTER_KEY,
    });
  }
  return client;
}

export interface ProductDoc {
  id: string;
  slug: string;
  asin: string;
  title: string;
  brand: string | null;
  categorySlug: string | null;
  editorialRating: number | null;
  placeholderKey: string | null;
}

/** Reindex all PUBLISHED products into Meilisearch (called on publish / sync). */
export async function reindexProducts(locale = "en"): Promise<number> {
  const rows = await db.product.findMany({
    where: { status: "PUBLISHED", isActive: true },
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
  });

  const docs: ProductDoc[] = rows.map((p) => ({
    id: p.id,
    slug: p.slug,
    asin: p.asin,
    title: p.translations[0]?.title ?? p.slug,
    brand: p.brand,
    categorySlug: p.category?.slug ?? null,
    editorialRating: p.editorialRating,
    placeholderKey: p.placeholderKey,
  }));

  const index = getClient().index<ProductDoc>(PRODUCTS_INDEX);
  await index.updateSearchableAttributes(["title", "brand"]);
  await index.updateFilterableAttributes(["categorySlug"]);
  if (docs.length > 0) await index.addDocuments(docs);
  return docs.length;
}

/** Typo-tolerant product search via Meilisearch. Throws if Meili is unreachable. */
export async function searchProductsMeili(query: string, limit = 24): Promise<ProductDoc[]> {
  const index = getClient().index<ProductDoc>(PRODUCTS_INDEX);
  const res = await index.search(query, { limit });
  return res.hits;
}
