import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Link } from "@/i18n/navigation";
import { getPublishedArticles } from "@/lib/blog/queries";

export const revalidate = 3600; // ISR 1h

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Guides & Reviews",
    description:
      "Honest cookware guides and reviews — ceramic nonstick, PFAS-free cookware, cast iron, and more.",
    alternates: { canonical: "/blog" },
  };
}

const monthFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function BlogIndex({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [articles, t] = await Promise.all([getPublishedArticles(locale), getTranslations("blog")]);

  const [hero, ...rest] = articles;

  return (
    <main>
      <section className="border-b border-border bg-paper-soft">
        <Container size="lg" className="py-14 sm:py-20">
          <SectionHeading
            level="h1"
            eyebrow={t("eyebrow")}
            title="Guides & reviews"
            kicker={t("kicker")}
          />
        </Container>
      </section>

      <section>
        <Container size="lg" className="py-16 sm:py-20">
          {articles.length === 0 ? (
            <p className="text-sm leading-relaxed text-muted">{t("empty")}</p>
          ) : (
            <div className="space-y-16">
              {hero ? (
                <Link
                  href={`/blog/${hero.slug}`}
                  data-reveal
                  className="reveal group grid items-start gap-8 rounded-3xl border border-border bg-surface p-8 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-ember-200 dark:hover:border-ember-500/60 hover:shadow-lift lg:grid-cols-[1fr_1.2fr] lg:p-10"
                >
                  <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-cream-100 via-cream-200 to-ember-100 dark:from-cocoa-700 dark:via-cocoa-800 dark:to-ember-900">
                    <span
                      aria-hidden
                      className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_35%,rgba(216,90,29,0.20),transparent_55%)]"
                    />
                    <span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-cocoa-800/90 px-3 py-1 text-[0.65rem] font-medium uppercase tracking-[0.2em] text-cream-50 dark:bg-ember-500/90 dark:text-primary-foreground">
                      Featured · {hero.type}
                    </span>
                  </div>
                  <div className="flex h-full flex-col gap-4">
                    <span className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
                      {hero.publishedAt ? monthFormat.format(hero.publishedAt) : "Draft"}
                    </span>
                    <h2 className="font-display text-3xl font-medium leading-tight tracking-tight text-foreground text-balance transition-colors group-hover:text-ember-700 dark:group-hover:text-ember-200 sm:text-4xl">
                      {hero.title}
                    </h2>
                    {hero.excerpt ? (
                      <p className="text-base leading-relaxed text-muted text-pretty">
                        {hero.excerpt}
                      </p>
                    ) : null}
                    <span className="mt-auto inline-flex items-center gap-2 text-sm font-medium text-muted">
                      {t("by", { author: hero.authorName })}
                      <span aria-hidden>·</span>
                      <span className="text-ember-600 transition-transform group-hover:translate-x-0.5">
                        Read the guide →
                      </span>
                    </span>
                  </div>
                </Link>
              ) : null}

              {rest.length > 0 ? (
                <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {rest.map((a, i) => (
                    <li
                      key={a.slug}
                      className="reveal"
                      data-reveal
                      style={{ "--reveal-index": i } as React.CSSProperties}
                    >
                      <Link
                        href={`/blog/${a.slug}`}
                        className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-7 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-ember-200 dark:hover:border-ember-500/60 hover:shadow-lift"
                      >
                        <span className="text-[0.7rem] font-medium uppercase tracking-[0.18em] text-ember-600">
                          {a.type}
                          {a.publishedAt ? (
                            <>
                              <span aria-hidden className="mx-1.5 text-subtle">
                                ·
                              </span>
                              <span className="text-muted">
                                {monthFormat.format(a.publishedAt)}
                              </span>
                            </>
                          ) : null}
                        </span>
                        <h3 className="font-display text-xl font-medium leading-snug text-foreground transition-colors group-hover:text-ember-700 dark:group-hover:text-ember-200">
                          {a.title}
                        </h3>
                        {a.excerpt ? (
                          <p className="line-clamp-3 text-sm leading-relaxed text-muted">
                            {a.excerpt}
                          </p>
                        ) : null}
                        <span className="mt-auto inline-flex items-center gap-1.5 text-xs font-medium text-muted">
                          {t("by", { author: a.authorName })}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          )}
        </Container>
      </section>
    </main>
  );
}
