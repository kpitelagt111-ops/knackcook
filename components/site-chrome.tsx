import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Container } from "@/components/ui/container";
import { Link } from "@/i18n/navigation";
import { Disclosure } from "./disclosure";
import { NewsletterForm } from "./newsletter-form";

function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        aria-hidden
        className="relative inline-flex size-9 items-center justify-center rounded-full bg-cocoa-700 text-cream-50 shadow-soft"
      >
        <span className="absolute inset-0.5 rounded-full bg-gradient-to-br from-ember-400 to-ember-600 opacity-90" />
        <span className="relative font-display text-base font-semibold leading-none">K</span>
      </span>
      <span className="flex flex-col leading-none">
        <span className="font-display text-lg font-medium tracking-tight text-foreground">
          KnackCook
        </span>
        <span className="mt-0.5 text-[0.6rem] font-medium uppercase tracking-[0.22em] text-ember-600">
          Editorial · Kitchen
        </span>
      </span>
    </span>
  );
}

export function SiteHeader() {
  const tNav = useTranslations("nav");
  const tCommon = useTranslations("common");

  const links: { href: string; label: string }[] = [
    { href: "/", label: "Home" },
    { href: "/blog", label: tNav("guides") },
    { href: "/compare", label: tNav("compare") },
    { href: "/wishlist", label: tNav("wishlist") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
      <Container size="lg" className="flex h-16 items-center gap-6 sm:h-20">
        <Link
          href="/"
          aria-label={tCommon("siteName")}
          className="-ml-1 inline-flex shrink-0 items-center rounded-full px-1 py-1 transition-opacity hover:opacity-80"
        >
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden flex-1 items-center justify-center md:flex">
          <ul className="flex items-center gap-1 rounded-full border border-border bg-surface/60 px-2 py-1.5 text-sm shadow-soft backdrop-blur">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="nav-underline inline-flex h-9 items-center rounded-full px-4 text-foreground/80 transition-colors hover:text-foreground"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <search className="hidden sm:block">
            <form
              action="/en/search"
              className="flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-2 shadow-soft transition-colors focus-within:border-ember-400 focus-within:shadow-card"
            >
              <SearchIcon className="size-4 text-muted" />
              <input
                name="q"
                type="search"
                placeholder={tNav("search")}
                aria-label={tCommon("search")}
                className="w-44 bg-transparent text-sm placeholder:text-subtle outline-none lg:w-56"
              />
            </form>
          </search>
          <ThemeToggle />
          <Link
            href="/wishlist"
            aria-label={tNav("wishlist")}
            className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-surface text-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:border-ember-300 dark:hover:border-ember-500/70 hover:text-ember-600 dark:hover:text-ember-300 sm:hidden"
          >
            <HeartIcon className="size-4" />
          </Link>
        </div>
      </Container>

      <nav aria-label="Mobile primary" className="border-t border-border md:hidden">
        <Container size="lg" className="flex h-12 items-center gap-1 overflow-x-auto">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex h-8 shrink-0 items-center rounded-full px-3 text-xs font-medium uppercase tracking-[0.14em] text-muted transition-colors hover:bg-surface-2 hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </Container>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  const tFooter = useTranslations("footer");
  const tCommon = useTranslations("common");
  const tNav = useTranslations("nav");
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-border bg-paper-soft">
      <Container size="lg" className="py-16">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr] lg:gap-16">
          {/* Newsletter */}
          <section
            aria-labelledby="footer-newsletter"
            className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 shadow-card"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-ember-100 blur-3xl dark:bg-ember-700/30"
            />
            <span className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
              {tFooter("newsletterEyebrow")}
            </span>
            <h2
              id="footer-newsletter"
              className="mt-3 font-display text-2xl font-medium leading-tight tracking-tight sm:text-3xl"
            >
              {tFooter("newsletterTitle")}
            </h2>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
              {tFooter("newsletterSubtitle")}
            </p>
            <div className="relative mt-6">
              <NewsletterForm />
            </div>
          </section>

          {/* Nav columns */}
          <section className="flex flex-col gap-3">
            <h3 className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
              {tFooter("navTitle")}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link href="/blog" className="hover:text-ember-600 dark:hover:text-ember-300">
                  {tNav("guides")}
                </Link>
              </li>
              <li>
                <Link href="/compare" className="hover:text-ember-600 dark:hover:text-ember-300">
                  {tNav("compare")}
                </Link>
              </li>
              <li>
                <Link href="/wishlist" className="hover:text-ember-600 dark:hover:text-ember-300">
                  {tNav("wishlist")}
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-ember-600 dark:hover:text-ember-300">
                  {tCommon("search")}
                </Link>
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h3 className="text-[0.7rem] font-medium uppercase tracking-[0.22em] text-ember-600">
              {tFooter("legalTitle")}
            </h3>
            <ul className="space-y-2.5 text-sm">
              <li>
                <Link
                  href="/affiliate-disclosure"
                  className="hover:text-ember-600 dark:hover:text-ember-300"
                >
                  {tFooter("affiliate")}
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/privacy"
                  className="hover:text-ember-600 dark:hover:text-ember-300"
                >
                  {tFooter("privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/cookies"
                  className="hover:text-ember-600 dark:hover:text-ember-300"
                >
                  {tFooter("cookies")}
                </Link>
              </li>
              <li>
                <Link
                  href="/legal/notice"
                  className="hover:text-ember-600 dark:hover:text-ember-300"
                >
                  {tFooter("legal")}
                </Link>
              </li>
            </ul>
          </section>
        </div>

        <hr className="my-10 border-border" />

        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Disclosure />
            <p className="text-xs text-subtle">
              {tFooter("copyright", { year, siteName: tCommon("siteName") })}
            </p>
          </div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            {tFooter("tagline")}
          </p>
        </div>
      </Container>
    </footer>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="9" cy="9" r="6" />
      <path d="M14 14l4 4" />
    </svg>
  );
}

function HeartIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M10 16.5s-6-3.6-6-8a3.5 3.5 0 0 1 6-2.5A3.5 3.5 0 0 1 16 8.5c0 4.4-6 8-6 8z" />
    </svg>
  );
}
