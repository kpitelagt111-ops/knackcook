/**
 * Affiliate link construction — locale → marketplace → tag.
 *
 * Compliance: links DO NOT require the Creators API. Tags are placeholders
 * until the Amazon Associates account is approved (PR-1). One tag per
 * marketplace; adding a market = one entry here, no rework.
 * See docs/ARCHITECTURE.md §7 and docs/REQUIREMENTS.md §6 (REQ-L-06).
 */

export type Locale = "en";

interface MarketplaceConfig {
  host: string;
  tag: string;
}

const MARKETPLACES: Record<Locale, MarketplaceConfig> = {
  en: {
    host: "www.amazon.com",
    tag: process.env.AMAZON_TAG_US ?? "knackcook-20",
  },
};

const ASIN_PATTERN = /^[A-Z0-9]{10}$/;

export function isValidAsin(asin: string): boolean {
  return ASIN_PATTERN.test(asin);
}

/**
 * Build the affiliate URL for an ASIN in a given locale.
 * Falls back to the default marketplace for unknown locales.
 */
export function buildAffiliateUrl(asin: string, locale: string): string {
  if (!isValidAsin(asin)) {
    throw new Error(`Invalid ASIN: ${asin}`);
  }
  const mp = MARKETPLACES[locale as Locale] ?? MARKETPLACES.en;
  return `https://${mp.host}/dp/${asin}?tag=${mp.tag}`;
}
