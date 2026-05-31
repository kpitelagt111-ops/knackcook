import { Link } from "@/i18n/navigation";

export interface Crumb {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: Crumb[] }) {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://knackcook.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: `${base}${c.href}` } : {}),
    })),
  };

  return (
    <nav
      aria-label="Breadcrumb"
      className="text-xs font-medium uppercase tracking-[0.14em] text-muted"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((c, i) => (
          <li key={c.href ?? c.label} className="flex items-center gap-2">
            {c.href ? (
              <Link
                href={c.href}
                className="transition-colors hover:text-ember-600 dark:hover:text-ember-300"
              >
                {c.label}
              </Link>
            ) : (
              <span aria-current="page" className="truncate text-foreground">
                {c.label}
              </span>
            )}
            {i < items.length - 1 ? (
              <span aria-hidden className="text-ember-400">
                ·
              </span>
            ) : null}
          </li>
        ))}
      </ol>
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data is trusted
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </nav>
  );
}
