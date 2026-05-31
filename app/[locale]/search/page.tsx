import { getTranslations, setRequestLocale } from "next-intl/server";
import { ProductCard } from "@/components/product-card";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Input } from "@/components/ui/input";
import { SectionHeading } from "@/components/ui/section-heading";
import { searchProducts } from "@/lib/products/queries";

export const dynamic = "force-dynamic"; // SSR live search

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const { q } = await searchParams;
  setRequestLocale(locale);

  const query = q?.trim() ?? "";
  const [results, t] = await Promise.all([
    query ? searchProducts(query, locale) : Promise.resolve([]),
    getTranslations("search"),
  ]);

  return (
    <main>
      <section className="border-b border-border bg-paper-soft">
        <Container size="lg" className="py-14 sm:py-20">
          <SectionHeading
            level="h1"
            eyebrow="Find a review"
            title={t("title")}
            kicker={query ? undefined : t("empty")}
          />
          <search className="mt-10 block">
            <form
              action={`/${locale}/search`}
              className="flex max-w-2xl flex-col gap-3 sm:flex-row"
            >
              <Input
                name="q"
                type="search"
                inputSize="lg"
                defaultValue={query}
                placeholder={t("placeholder")}
                className="flex-1"
                aria-label={t("placeholder")}
                autoFocus
              />
              <Button type="submit" variant="primary" size="lg" shape="rounded">
                {t("title")}
              </Button>
            </form>
          </search>
          {query ? (
            <p className="mt-6 text-sm text-muted">
              {t("resultCount", { count: results.length, query })}
            </p>
          ) : null}
        </Container>
      </section>

      {query ? (
        <section>
          <Container size="lg" className="py-12 sm:py-16">
            {results.length === 0 ? (
              <p className="text-sm leading-relaxed text-muted">
                No products match “{query}”. Try a broader term.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
                {results.map((p, i) => (
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
      ) : null}
    </main>
  );
}
