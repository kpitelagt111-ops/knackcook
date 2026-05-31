import { setRequestLocale } from "next-intl/server";
import { AmazonCTA } from "@/components/amazon-cta";
import { ProductImage } from "@/components/product-image";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic"; // SSR — selection via ?ids=

interface CompareRow {
  slug: string;
  asin: string;
  title: string;
  brand: string | null;
  editorialRating: number | null;
  categorySlug: string | null;
  placeholderKey: string | null;
}

async function loadProducts(ids: string[], locale: string): Promise<CompareRow[]> {
  if (ids.length === 0) return [];
  const rows = await db.product.findMany({
    where: { slug: { in: ids }, status: "PUBLISHED", isActive: true },
    select: {
      slug: true,
      asin: true,
      brand: true,
      editorialRating: true,
      placeholderKey: true,
      category: { select: { slug: true } },
      translations: { where: { locale }, select: { title: true }, take: 1 },
    },
  });
  return rows.map((p) => ({
    slug: p.slug,
    asin: p.asin,
    title: p.translations[0]?.title ?? p.slug,
    brand: p.brand,
    editorialRating: p.editorialRating,
    categorySlug: p.category?.slug ?? null,
    placeholderKey: p.placeholderKey,
  }));
}

export default async function ComparePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ids?: string }>;
}) {
  const { locale } = await params;
  const { ids } = await searchParams;
  setRequestLocale(locale);

  const slugs = (ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
  const products = await loadProducts(slugs, locale);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold">Compare products</h1>
      {products.length < 2 ? (
        <p className="mt-4 text-sm text-muted">
          Select 2 to 4 products to compare (e.g. <code>?ids=slug-a,slug-b</code>).
        </p>
      ) : (
        <div className="reveal mt-6 overflow-x-auto" data-reveal>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                <th className="border-b p-2 text-left" />
                {products.map((p) => (
                  <th key={p.slug} className="border-b p-2 text-left align-bottom">
                    <ProductImage
                      placeholderKey={p.placeholderKey ?? p.categorySlug}
                      className="mb-2 aspect-square w-24 rounded-md object-cover"
                    />
                    <div className="font-semibold">{p.title}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th className="border-b p-2 text-left font-medium">Brand</th>
                {products.map((p) => (
                  <td key={p.slug} className="border-b p-2">
                    {p.brand ?? "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="border-b p-2 text-left font-medium">Our verdict</th>
                {products.map((p) => (
                  <td key={p.slug} className="border-b p-2">
                    {p.editorialRating != null ? `${p.editorialRating}/10` : "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <th className="p-2 text-left font-medium" />
                {products.map((p) => (
                  <td key={p.slug} className="p-2">
                    <AmazonCTA asin={p.asin} locale={locale} className="text-sm underline" />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
