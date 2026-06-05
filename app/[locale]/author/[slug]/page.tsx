import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { SectionHeading } from "@/components/ui/section-heading";
import { Link } from "@/i18n/navigation";
import { getAuthorBySlug } from "@/lib/blog/queries";

export const revalidate = 21600; // ISR 6h

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://knackcook.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const author = await getAuthorBySlug(slug, locale);
  if (!author) return {};
  const url = `${SITE_URL}/${locale}/author/${author.slug}`;
  const description = author.bio
    ? author.bio.slice(0, 160)
    : `Articles and buying guides by ${author.name} at KnackCook.`;
  return {
    title: `${author.name} — Editor`,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "profile",
      url,
      title: `${author.name} — Editor at KnackCook`,
      description,
    },
  };
}

const monthFormat = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export default async function AuthorPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  const author = await getAuthorBySlug(slug, locale);
  if (!author) notFound();

  const t = await getTranslations("author");

  const authorUrl = `${SITE_URL}/${locale}/author/${author.slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: author.name,
    url: authorUrl,
    ...(author.bio ? { description: author.bio } : {}),
    ...(author.avatarPath
      ? { image: author.avatarPath.startsWith("http") ? author.avatarPath : `${SITE_URL}${author.avatarPath}` }
      : {}),
    jobTitle: "Research Analyst",
    knowsAbout: [
      "Cast iron cookware",
      "Kitchenware reviews",
      "Cookware buying guides",
      "Glass-top and induction cooking",
    ],
    worksFor: {
      "@type": "Organization",
      name: "KnackCook",
      url: SITE_URL,
    },
  };

  return (
    <main>
      <section className="border-b border-border bg-paper-soft">
        <Container size="md" className="py-14 sm:py-20">
          <div className="flex flex-col items-start gap-7 sm:flex-row sm:items-center">
            {author.avatarPath ? (
              <Image
                src={author.avatarPath}
                alt={author.name}
                width={96}
                height={96}
                sizes="96px"
                className="size-24 rounded-full border-4 border-surface object-cover shadow-card"
              />
            ) : (
              <div className="relative flex size-24 items-center justify-center rounded-full border-4 border-surface bg-gradient-to-br from-cocoa-700 to-ember-700 font-display text-3xl font-semibold text-cream-50 shadow-card dark:from-ember-700 dark:to-ember-500">
                {author.name.charAt(0)}
              </div>
            )}
            <div className="space-y-3">
              <span className="inline-flex items-center gap-2 text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
                <span className="rule-ember" />
                Editor
              </span>
              <h1 className="font-display text-4xl font-medium leading-tight tracking-tight text-foreground sm:text-5xl">
                {author.name}
              </h1>
              {author.bio ? (
                <p className="max-w-xl text-base leading-relaxed text-muted text-pretty">
                  {author.bio}
                </p>
              ) : null}
            </div>
          </div>
        </Container>
      </section>

      <section>
        <Container size="md" className="py-16 sm:py-20">
          <SectionHeading
            level="h2"
            eyebrow="Bylines"
            title={t("articlesHeading", { name: author.name })}
          />
          {author.articles.length === 0 ? (
            <p className="mt-10 text-sm leading-relaxed text-muted">{t("noArticles")}</p>
          ) : (
            <ul className="mt-10 divide-y divide-border">
              {author.articles.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/blog/${a.slug}`}
                    className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-6 transition-colors hover:bg-paper-soft sm:gap-8"
                  >
                    <span className="hidden text-[0.7rem] font-medium uppercase tracking-[0.18em] text-ember-600 sm:inline">
                      {a.type}
                    </span>
                    <div>
                      <h3 className="font-display text-xl font-medium leading-snug text-foreground transition-colors group-hover:text-ember-700 dark:group-hover:text-ember-200">
                        {a.title}
                      </h3>
                      {a.excerpt ? (
                        <p className="mt-1 line-clamp-1 text-sm text-muted">{a.excerpt}</p>
                      ) : null}
                    </div>
                    <span className="hidden whitespace-nowrap text-xs font-medium uppercase tracking-[0.14em] text-muted sm:inline">
                      {a.publishedAt ? monthFormat.format(a.publishedAt) : "Draft"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data is trusted
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
