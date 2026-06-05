import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AmazonCTA } from "@/components/amazon-cta";
import { Breadcrumb } from "@/components/breadcrumb";
import { Disclosure } from "@/components/disclosure";
import { ProductCard } from "@/components/product-card";
import { ProductImage } from "@/components/product-image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Rating } from "@/components/ui/rating";
import { SectionHeading } from "@/components/ui/section-heading";
import { WishlistButton } from "@/components/wishlist-button";
import { getProductBySlug, getRelatedProducts } from "@/lib/products/queries";

export const revalidate = 3600; // ISR 1h

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const p = await getProductBySlug(slug, locale);
  if (!p) return {};
  return {
    title: p.metaTitle ?? p.title,
    description: p.metaDescription ?? p.editorialReview?.slice(0, 160) ?? undefined,
    openGraph: { title: p.metaTitle ?? p.title, type: "website" },
    // localePrefix: "never" — canonical must match the unprefixed URL Next.js serves.
    alternates: { canonical: `/products/${p.slug}` },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const p = await getProductBySlug(slug, locale);
  if (!p) notFound();

  const [related, t] = await Promise.all([
    getRelatedProducts(p.categorySlug, p.id, locale),
    getTranslations("product"),
  ]);

  // Schema.org Review with OUR editorial rating (never Amazon AggregateRating).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    brand: p.brand ?? undefined,
    review:
      p.editorialRating != null
        ? {
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: p.editorialRating,
              bestRating: 10,
            },
            author: { "@type": "Organization", name: "KnackCook" },
          }
        : undefined,
  };

  return (
    <main>
      {/* HERO / OVERVIEW */}
      <section className="border-b border-border bg-paper-soft">
        <Container size="lg" className="py-8 sm:py-12">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              ...(p.categorySlug
                ? [
                    {
                      label: p.categoryName ?? p.categorySlug,
                      href: `/category/${p.categorySlug}`,
                    },
                  ]
                : []),
              { label: p.title },
            ]}
          />

          <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
            {/* Image */}
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-ember-100/60 via-cream-100 to-cream-50 blur-2xl dark:from-ember-700/30 dark:via-cocoa-700/50 dark:to-cocoa-800/50"
              />
              <Card variant="default" className="overflow-hidden p-3 shadow-lift sm:p-4">
                <ProductImage
                  path={p.images[0]?.path}
                  alt={p.images[0]?.alt ?? p.title}
                  placeholderKey={p.placeholderKey ?? p.categorySlug}
                  className="aspect-[4/5] w-full rounded-2xl"
                  sizes="(min-width: 1024px) 50vw, 100vw"
                  priority
                />
              </Card>
              {p.images.length > 1 ? (
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {p.images.slice(1, 5).map((img) => (
                    <div
                      key={img.path}
                      className="overflow-hidden rounded-xl border border-border bg-surface"
                    >
                      <ProductImage
                        path={img.path}
                        alt={img.alt ?? p.title}
                        placeholderKey={p.placeholderKey ?? p.categorySlug}
                        className="aspect-square w-full rounded-xl"
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Verdict & CTA */}
            <div className="lg:sticky lg:top-28">
              <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
                <span className="rule-ember" />
                {t("eyebrow")}
              </span>
              {p.brand ? (
                <p className="mt-5 text-sm font-medium uppercase tracking-[0.18em] text-muted">
                  {p.brand}
                </p>
              ) : null}
              <h1 className="mt-2 font-display text-4xl font-medium leading-[1.05] tracking-tight text-foreground text-balance sm:text-5xl">
                {p.title}
              </h1>

              {p.editorialRating != null ? (
                <div className="mt-8 flex items-center gap-5 rounded-2xl border border-ember-100 bg-ember-50 p-5 dark:border-ember-700/60 dark:bg-ember-900/30">
                  <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-ember-500 font-display text-2xl font-semibold text-primary-foreground shadow-soft">
                    {p.editorialRating.toFixed(1)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-ember-700 dark:text-ember-200">
                      {t("ourVerdict")}
                    </p>
                    <p className="mt-1 font-display text-lg leading-tight text-ember-900 dark:text-ember-100">
                      {p.editorialRating >= 9
                        ? "Outstanding — buy with confidence."
                        : p.editorialRating >= 7.5
                          ? "A confident editorial pick."
                          : p.editorialRating >= 6
                            ? "Solid, with caveats."
                            : "Better options exist."}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* CTA */}
              <div className="mt-8 space-y-3">
                <AmazonCTA asin={p.asin} locale={locale} size="lg" shape="rounded" full />
                <WishlistButton slug={p.slug} variant="full" className="w-full" />
                <Disclosure className="mt-1" />
              </div>

              {/* Quick spec strip */}
              <div className="mt-8 grid grid-cols-2 gap-3 text-xs">
                {p.categoryName ? (
                  <Badge variant="cream" size="md" className="justify-center">
                    {p.categoryName}
                  </Badge>
                ) : null}
                <Badge
                  variant="outline"
                  size="md"
                  className="justify-center normal-case tracking-normal"
                >
                  ASIN · {p.asin}
                </Badge>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* REVIEW BODY */}
      {p.editorialReview ? (
        <section className="border-b border-border">
          <Container size="md" className="py-16 sm:py-20">
            <SectionHeading level="h2" eyebrow={t("eyebrow")} title={t("review")} />
            <div className="prose prose-article mt-10 whitespace-pre-line">{p.editorialReview}</div>
          </Container>
        </section>
      ) : null}

      {/* PROS / CONS */}
      {p.pros.length > 0 || p.cons.length > 0 ? (
        <section className="border-b border-border bg-paper-soft">
          <Container size="md" className="py-16 sm:py-20">
            <div className="grid gap-6 md:grid-cols-2">
              {p.pros.length > 0 ? (
                <Card className="p-7">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-success-50 text-success-600 dark:bg-success-600/20 dark:text-success-50">
                      <CheckIcon className="size-4" />
                    </span>
                    <h3 className="font-display text-xl font-medium text-foreground">
                      {t("pros")}
                    </h3>
                  </div>
                  <ul className="mt-5 space-y-3 text-sm leading-relaxed">
                    {p.pros.map((x) => (
                      <li key={x} className="flex gap-3 text-foreground">
                        <span
                          aria-hidden
                          className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-success-600"
                        />
                        <span>{x}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
              {p.cons.length > 0 ? (
                <Card className="p-7">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-danger-50 text-danger-600 dark:bg-danger-600/20 dark:text-danger-50">
                      <MinusIcon className="size-4" />
                    </span>
                    <h3 className="font-display text-xl font-medium text-foreground">
                      {t("cons")}
                    </h3>
                  </div>
                  <ul className="mt-5 space-y-3 text-sm leading-relaxed">
                    {p.cons.map((x) => (
                      <li key={x} className="flex gap-3 text-foreground">
                        <span
                          aria-hidden
                          className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-danger-600"
                        />
                        <span>{x}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              ) : null}
            </div>
          </Container>
        </section>
      ) : null}

      {/* CTA REPEAT */}
      <section className="border-b border-border">
        <Container size="md" className="py-12">
          <Card
            variant="ember"
            className="flex flex-col items-start gap-4 p-7 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              {p.editorialRating != null ? <Rating score={p.editorialRating} size="md" /> : null}
              <p className="mt-3 font-display text-xl font-medium leading-tight text-ember-900 dark:text-ember-100">
                Ready to put {p.title} on your counter?
              </p>
              <Disclosure className="mt-2 text-ember-800/80 dark:text-ember-200/80" />
            </div>
            <AmazonCTA asin={p.asin} locale={locale} size="lg" shape="rounded" />
          </Card>
        </Container>
      </section>

      {/* RELATED */}
      {related.length > 0 ? (
        <section>
          <Container size="lg" className="py-16 sm:py-20">
            <SectionHeading
              level="h2"
              eyebrow="Editorial picks"
              title={t("related")}
              kicker="Other gear in the same category we've reviewed and rated."
            />
            <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((r) => (
                <ProductCard key={r.id} product={r} />
              ))}
            </div>
          </Container>
        </section>
      ) : null}

      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data is trusted
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 10l4 4 8-9" />
    </svg>
  );
}

function MinusIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 10h10" />
    </svg>
  );
}
