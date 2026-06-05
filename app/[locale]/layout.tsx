import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { CookieConsent } from "@/components/cookie-consent";
import { GoogleAnalytics } from "@/components/google-analytics";
import { ScrollReveal } from "@/components/scroll-reveal";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { routing } from "@/i18n/routing";
import "../globals.css";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://knackcook.com";

// FIXME(deploy): Forced dynamic to unblock Docker build (postgres not reachable
// during `docker compose build`). Re-enable ISR once `lib/db.ts` wraps queries
// to return empty/null gracefully when DB is unreachable at build time.
export const dynamic = "force-dynamic";

const NO_FLASH_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=document.documentElement;d.classList.remove('light','dark');if(t==='light'){d.classList.add('light')}else{d.classList.add('dark')}}catch(e){document.documentElement.classList.add('dark')}})();`;

/**
 * Body sans — Manrope. Modern geometric humanist, distinct from Inter/Roboto.
 * Display serif — Fraunces. Warm, editorial, variable axes for delicate
 * weight + optical-size adjustments in headlines.
 */
const sans = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans-stack",
});

const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display-stack",
  axes: ["SOFT", "WONK", "opsz"],
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const languages: Record<string, string> = {};
  for (const l of routing.locales) {
    languages[l] = `${SITE_URL}/${l}`;
  }
  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: "KnackCook",
      template: "%s | KnackCook",
    },
    description: "Honest editorial reviews and buying guides for the best kitchen gear.",
    alternates: {
      canonical: `${SITE_URL}/${locale}`,
      languages,
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  setRequestLocale(locale);

  return (
    <html lang={locale} className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: pre-paint theme bootstrap to prevent FOUC
          dangerouslySetInnerHTML={{ __html: NO_FLASH_THEME_SCRIPT }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider>
          <ThemeProvider>
            <ScrollReveal />
            <SiteHeader />
            <div className="flex-1">{children}</div>
            <SiteFooter />
            <CookieConsent />
            <GoogleAnalytics />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
