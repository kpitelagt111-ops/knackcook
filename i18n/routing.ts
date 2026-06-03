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
  // Single-locale: no prefix at all. Avoid next-intl v4 redirect loop on `as-needed`
  // when only one locale is defined. Switch to `"as-needed"` the day a second locale
  // is added — at that point the loop bug no longer applies.
  localePrefix: "never",
});

export type Locale = (typeof routing.locales)[number];
