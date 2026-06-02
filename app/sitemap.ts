import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getAuthorSlugs, getPublishedArticleSitemapEntries } from "@/lib/blog/queries";
import { getCategorySlugs, getPublishedProductSitemapEntries } from "@/lib/products/queries";

/**
 * Dynamic sitemap — reflects DB content. Marked `force-dynamic` so each request
 * sees freshly published products/articles (n8n ingestion + manual publish).
 * See docs/REQUIREMENTS.md (SEO) and AGENTS.md §6.
 */
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://knackcook.com";

function url(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

// Default locale is served at root (no prefix). Other locales get /xx/...
function localePath(locale: string, path: string): string {
  return locale === routing.defaultLocale ? path : `/${locale}${path}`;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, articles, categorySlugs, authorSlugs] = await Promise.all([
    getPublishedProductSitemapEntries(),
    getPublishedArticleSitemapEntries(),
    getCategorySlugs(),
    getAuthorSlugs(),
  ]);

  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const locale of routing.locales) {
    entries.push({
      url: url(localePath(locale, "/") || "/"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    });

    entries.push({
      url: url(localePath(locale, "/blog")),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    });

    for (const p of products) {
      entries.push({
        url: url(localePath(locale, `/products/${p.slug}`)),
        lastModified: p.updatedAt,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }

    for (const a of articles) {
      entries.push({
        url: url(localePath(locale, `/blog/${a.slug}`)),
        lastModified: a.updatedAt,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    for (const slug of categorySlugs) {
      entries.push({
        url: url(localePath(locale, `/category/${slug}`)),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    for (const slug of authorSlugs) {
      entries.push({
        url: url(localePath(locale, `/author/${slug}`)),
        lastModified: now,
        changeFrequency: "monthly",
        priority: 0.4,
      });
    }
  }

  return entries;
}
