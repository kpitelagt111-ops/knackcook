import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/breadcrumb";
import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { db } from "@/lib/db";
import { getProductsByCategory } from "@/lib/products/queries";

export const dynamic = "force-dynamic"; // SSR (filters/pagination) — REQ §4

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { alternates: { canonical: `/category/${slug}` } };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const category = await db.category.findUnique({
    where: { slug },
    select: { slug: true, translations: { where: { locale }, take: 1 } },
  });
  if (!category) notFound();

  const name = category.translations[0]?.name ?? slug;
  const [products, t] = await Promise.all([
    getProductsByCategory(slug, locale),
    getTranslations("category"),
  ]);

  return (
    <main>
      <section className="border-b border-border bg-paper-soft">
        <Container size="lg" className="py-12 sm:py-16">
          <Breadcrumb items={[{ label: "Home", href: "/" }, { label: name }]} />
          <div className="mt-8">
            <SectionHeading
              level="h1"
              eyebrow="Category"
              title={name}
              kicker={`Every product in ${name.toLowerCase()} we've reviewed and rated.`}
            />
          </div>
        </Container>
      </section>

      <section>
        <Container size="lg" className="py-12 sm:py-16">
          {products.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted">{t("empty")}</p>
          ) : (
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {products.map((p, i) => (
                <div
                  key={p.id}
                  className="reveal"
                  data-reveal
                  style={{ "--reveal-index": i } as React.CSSProperties}
                >
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          )}
        </Container>
      </section>
    </main>
  );
}
