import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { HeroParallax } from "@/components/hero-parallax";
import { ProductCard } from "@/components/product-card";
import { buttonStyles } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Link } from "@/i18n/navigation";
import { getPublishedArticles } from "@/lib/blog/queries";
import { getCategories, getPublishedProducts } from "@/lib/products/queries";

export const revalidate = 3600; // ISR 1h (REQ §9)

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://knackcook.com";
const HOME_TITLE = "KnackCook — Honest Cookware Reviews & Buying Guides";
const HOME_DESC =
  "Research-first cookware reviews and buying guides — honest verdicts scored out of 10, from cast iron to PFAS-free ceramic nonstick.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: { absolute: HOME_TITLE },
    description: HOME_DESC,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      siteName: "KnackCook",
      title: HOME_TITLE,
      description: HOME_DESC,
      images: [{ url: "/icon.png", width: 512, height: 512, alt: "KnackCook" }],
    },
    twitter: {
      card: "summary",
      title: HOME_TITLE,
      description: HOME_DESC,
      images: ["/icon.png"],
    },
  };
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("home");

  const [products, categories, articles] = await Promise.all([
    getPublishedProducts(locale),
    getCategories(locale),
    getPublishedArticles(locale, 3),
  ]);

  const heroProducts = products.slice(0, 3);

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: "KnackCook",
        url: SITE_URL,
        logo: `${SITE_URL}/icon.png`,
        description: HOME_DESC,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: "KnackCook",
        url: SITE_URL,
        publisher: { "@id": `${SITE_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/search?q={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };

  return (
    <main className="overflow-hidden">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data is trusted
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* ============= HERO ============= */}
      <section
        aria-labelledby="hero-title"
        className="bg-paper grain relative isolate overflow-hidden border-b border-border"
      >
        <Container size="lg" className="relative z-10 py-16 sm:py-24 lg:py-32">
          <div className="grid items-end gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
                <span className="rule-ember" />
                {t("heroEyebrow")}
              </span>
              <h1
                id="hero-title"
                className="mt-6 font-display text-5xl font-medium leading-[0.95] tracking-tight text-foreground text-balance sm:text-6xl lg:text-7xl"
              >
                {t("heroTitle")
                  .split(",")
                  .map((part, i, arr) => (
                    <span
                      key={part}
                      className={i === arr.length - 1 ? "italic text-ember-600" : ""}
                    >
                      {part}
                      {i < arr.length - 1 ? "," : ""}
                    </span>
                  ))}
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted text-pretty">
                {t("heroSubtitle")}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/blog"
                  className={buttonStyles({ variant: "primary", size: "lg", shape: "rounded" })}
                >
                  {t("heroCtaPrimary")}
                </Link>
                <Link
                  href="/blog"
                  className={buttonStyles({ variant: "outline", size: "lg", shape: "rounded" })}
                >
                  {t("heroCtaSecondary")}
                </Link>
              </div>
              <p className="mt-8 text-xs font-medium uppercase tracking-[0.18em] text-subtle">
                {t("trustBar")}
              </p>
            </div>

            {/* Hero collage */}
            <div className="relative hidden lg:block">
              {heroProducts.length > 0 ? (
                <HeroParallax className="relative h-[460px]">
                  {heroProducts.map((p, i) => {
                    const depth = i === 0 ? 0.55 : i === 1 ? 0.85 : 0.4;
                    return (
                      <div
                        key={p.id}
                        data-parallax-depth={depth}
                        className={[
                          "absolute will-change-transform",
                          i === 0
                            ? "right-16 top-0 rotate-[-4deg]"
                            : i === 1
                              ? "left-0 top-20 rotate-[3deg]"
                              : "bottom-0 right-0 rotate-[1deg]",
                        ].join(" ")}
                      >
                        <Link
                          href={`/products/${p.slug}`}
                          className="group block w-56 overflow-hidden rounded-3xl border border-border bg-surface shadow-lift transition-transform duration-500 hover:scale-[1.02]"
                        >
                          <ProductCardThumb
                            title={p.title}
                            brand={p.brand}
                            placeholderKey={p.placeholderKey ?? p.categorySlug}
                            rating={p.editorialRating}
                          />
                        </Link>
                      </div>
                    );
                  })}
                  <span
                    aria-hidden
                    data-parallax-depth="0.25"
                    className="pointer-events-none absolute -left-10 top-1/2 size-32 -translate-y-1/2 rounded-full bg-ember-200/60 blur-3xl dark:bg-ember-700/30"
                  />
                </HeroParallax>
              ) : (
                <HeroPlaceholder />
              )}
            </div>
          </div>
        </Container>
      </section>

      {/* ============= CATEGORIES ============= */}
      {categories.length > 0 ? (
        <section
          aria-labelledby="categories-title"
          className="reveal border-b border-border"
          data-reveal
        >
          <Container size="lg" className="py-16 sm:py-20">
            <SectionHeading
              level="h2"
              eyebrow={t("categoriesEyebrow")}
              title={t("categoriesTitle")}
              kicker={t("categoriesKicker")}
              trailing={
                <Link
                  href="/blog"
                  className="text-sm font-medium text-ember-600 hover:text-ember-700 dark:text-ember-300 dark:hover:text-ember-200"
                >
                  Browse all →
                </Link>
              }
            />
            <ul className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {categories.map((c, i) => (
                <li
                  key={c.slug}
                  className="reveal"
                  data-reveal
                  style={{ "--reveal-index": i } as React.CSSProperties}
                >
                  <Link
                    href={`/category/${c.slug}`}
                    className="group relative flex h-32 flex-col justify-between overflow-hidden rounded-2xl border border-border bg-surface p-5 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-ember-200 dark:hover:border-ember-500/60 hover:shadow-lift focus-visible:-translate-y-1 focus-visible:border-ember-300"
                  >
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-ember-100 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100 dark:bg-ember-700/50"
                    />
                    <span className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-subtle">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <span className="block font-display text-xl font-medium leading-tight text-foreground transition-colors group-hover:text-ember-700 dark:group-hover:text-ember-200">
                        {c.translations[0]?.name ?? c.slug}
                      </span>
                      <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                        Browse
                        <span
                          aria-hidden
                          className="transition-transform group-hover:translate-x-0.5"
                        >
                          →
                        </span>
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}

      {/* ============= FEATURED ============= */}
      <section
        aria-labelledby="featured-title"
        className="reveal border-b border-border"
        data-reveal
      >
        <Container size="lg" className="py-16 sm:py-24">
          <SectionHeading
            level="h2"
            eyebrow={t("featuredEyebrow")}
            title={t("featuredTitle")}
            kicker={t("featuredKicker")}
            trailing={
              products.length > 0 ? (
                <Link
                  href="/search"
                  className="text-sm font-medium text-ember-600 hover:text-ember-700 dark:text-ember-300 dark:hover:text-ember-200"
                >
                  See all reviews →
                </Link>
              ) : undefined
            }
          />
          {products.length === 0 ? (
            <p className="mt-10 max-w-prose text-sm leading-relaxed text-muted">
              {t("emptyProducts")}
            </p>
          ) : (
            <div className="mt-12 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
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

      {/* ============= GUIDES ============= */}
      {articles.length > 0 ? (
        <section aria-labelledby="guides-title" className="reveal bg-paper-soft" data-reveal>
          <Container size="lg" className="py-16 sm:py-24">
            <SectionHeading
              level="h2"
              eyebrow={t("guidesEyebrow")}
              title={t("guidesTitle")}
              kicker={t("guidesKicker")}
              trailing={
                <Link
                  href="/blog"
                  className="text-sm font-medium text-ember-600 hover:text-ember-700 dark:text-ember-300 dark:hover:text-ember-200"
                >
                  All guides →
                </Link>
              }
            />
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {articles.map((a, i) => (
                <li
                  key={a.slug}
                  className="reveal"
                  data-reveal
                  style={{ "--reveal-index": i } as React.CSSProperties}
                >
                  <Link
                    href={`/blog/${a.slug}`}
                    className="group flex h-full flex-col gap-4 rounded-2xl border border-border bg-surface p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-ember-200 dark:hover:border-ember-500/60 hover:shadow-lift"
                  >
                    <span className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-ember-600">
                      {a.type}
                    </span>
                    <h3 className="font-display text-xl font-medium leading-snug text-foreground transition-colors group-hover:text-ember-700 dark:group-hover:text-ember-200">
                      {a.title}
                    </h3>
                    {a.excerpt ? (
                      <p className="line-clamp-3 text-sm leading-relaxed text-muted">{a.excerpt}</p>
                    ) : null}
                    <span className="mt-auto inline-flex items-center gap-1 text-xs font-medium text-muted">
                      By {a.authorName}
                      <span aria-hidden>·</span>
                      <span className="text-ember-600 transition-transform group-hover:translate-x-0.5">
                        Read →
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Container>
        </section>
      ) : null}
    </main>
  );
}

function ProductCardThumb({
  title,
  brand,
  placeholderKey,
  rating,
}: {
  title: string;
  brand: string | null;
  placeholderKey: string | null;
  rating: number | null;
}) {
  return (
    <div className="flex flex-col">
      <div className="relative aspect-[5/6] overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cream-100 via-cream-50 to-ember-100 dark:from-cocoa-700 dark:via-cocoa-800 dark:to-ember-900" />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(232,122,60,0.25),transparent_60%)]"
        />
        {rating != null ? (
          <span className="absolute left-3 top-3 inline-flex h-7 items-center gap-1 rounded-full bg-cocoa-700 px-2.5 text-xs font-semibold text-cream-50 dark:bg-ember-500 dark:text-primary-foreground">
            ★ {rating.toFixed(1)}
          </span>
        ) : null}
        <span className="absolute bottom-3 left-3 text-[0.65rem] font-medium uppercase tracking-[0.18em] text-cocoa-500 dark:text-cream-400">
          {placeholderKey?.replace(/-/g, " ") ?? "kitchen"}
        </span>
      </div>
      <div className="px-4 py-3.5">
        {brand ? (
          <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-ember-600">
            {brand}
          </p>
        ) : null}
        <p className="mt-0.5 line-clamp-2 font-display text-sm font-medium text-foreground">
          {title}
        </p>
      </div>
    </div>
  );
}

function HeroPlaceholder() {
  return (
    <div className="relative grid h-[400px] grid-cols-2 gap-4">
      <div className="rounded-3xl bg-gradient-to-br from-ember-100 via-cream-100 to-cream-200 shadow-card dark:from-ember-800 dark:via-cocoa-700 dark:to-cocoa-800" />
      <div className="mt-12 rounded-3xl bg-gradient-to-br from-cocoa-700 via-cocoa-600 to-ember-700 shadow-card dark:from-cocoa-800 dark:via-cocoa-700 dark:to-ember-800" />
      <div className="-mt-12 rounded-3xl bg-gradient-to-tr from-cream-200 to-ember-200 shadow-card dark:from-cocoa-700 dark:to-ember-700" />
      <div className="rounded-3xl bg-gradient-to-tr from-ember-50 to-cream-50 shadow-card dark:from-ember-900 dark:to-cocoa-700" />
    </div>
  );
}
