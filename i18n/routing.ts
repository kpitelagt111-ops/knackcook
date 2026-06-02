import { defineRouting } from "next-intl/routing";

/**
 * i18n routing — English-only at launch, multi-market architecture ready.
 *
 * To add a market later (e.g. "fr"), append the locale here and provide the
 * matching `messages/<locale>.json` + per-entity Translation rows + the
 * locale→marketplace→tag mapping in `lib/affiliate/links.ts`. No rework needed.
 * See docs/ARCHITECTURE.md §9 and docs/REQUIREMENTS.md §6.
 */
export const routing = defineRouting({
  locales: ["en"],
  defaultLocale: "en",
  // Default locale (en) served at root (no prefix). Other locales get /xx/...
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
