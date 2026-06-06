import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Breadcrumb } from "@/components/breadcrumb";
import { ProductCard } from "@/components/product-card";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Link } from "@/i18n/navigation";
import { getArticleBySlug } from "@/lib/blog/queries";

export const revalidate = 3600; // ISR 1h

const monthFormat = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const a = await getArticleBySlug(slug, locale);
  if (!a) return {};
  return {
    title: a.metaTitle ?? a.title,
    description: a.metaDescription ?? a.excerpt ?? undefined,
    // localePrefix: "never" — canonical must match the unprefixed URL Next.js serves.
    alternates: { canonical: `/blog/${a.slug}` },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const a = await getArticleBySlug(slug, locale);
  if (!a) notFound();

  const t = await getTranslations("blog");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    author: { "@type": "Organization", name: a.author.name },
    datePublished: a.publishedAt?.toISOString(),
  };

  return (
    <main>
      {/* Article header */}
      <section className="bg-paper-soft border-b border-border">
        <Container size="md" className="py-12 sm:py-16">
          <Breadcrumb
            items={[
              { label: "Home", href: "/" },
              { label: "Guides", href: "/blog" },
              { label: a.title },
            ]}
          />
          <div className="mt-8 space-y-5">
            <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
              <span className="rule-ember" />
              {a.type}
              {a.publishedAt ? (
                <>
                  <span aria-hidden className="text-subtle">
                    ·
                  </span>
                  <span className="text-muted">{monthFormat.format(a.publishedAt)}</span>
                </>
              ) : null}
            </span>
            <h1 className="font-display text-4xl font-medium leading-[1.05] tracking-tight text-foreground text-balance sm:text-5xl lg:text-6xl">
              {a.title}
            </h1>
            {a.excerpt ? (
              <p className="max-w-2xl text-lg leading-relaxed text-muted text-pretty">
                {a.excerpt}
              </p>
            ) : null}
            <div className="flex items-center gap-3 pt-2">
              <span
                aria-hidden
                className="inline-flex size-10 items-center justify-center rounded-full bg-cocoa-700 text-cream-50 font-display text-sm font-semibold dark:bg-ember-700"
              >
                {a.author.name.charAt(0)}
              </span>
              <div className="text-sm leading-snug">
                <p className="text-muted">{t("by", { author: "" })}</p>
                <Link
                  href={`/author/${a.author.slug}`}
                  className="font-medium text-foreground hover:text-ember-600 dark:hover:text-ember-300"
                >
                  {a.author.name}
                </Link>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Body */}
      <section>
        <Container size="md" className="py-14 sm:py-20">
          <article
            // biome-ignore lint/security/noDangerouslySetInnerHtml: editorial body is authored/approved in the back office
            dangerouslySetInnerHTML={{ __html: a.body }}
            className="prose prose-article max-w-none"
          />
        </Container>
      </section>

      {/* Embedded products */}
      {a.products.length > 0 ? (
        <section className="border-t border-border bg-paper-soft">
          <Container size="lg" className="py-16 sm:py-20">
            <SectionHeading
              level="h2"
              eyebrow="Featured in this guide"
              title={t("embeddedHeading")}
              kicker="Editorial picks discussed in the article above."
            />
            <div className="mt-10 grid grid-cols-2 gap-5 sm:grid-cols-3">
              {a.products.map((p) => (
                <ProductCard key={p.id} product={p} />
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
