/**
 * Price provider — the compliance-critical abstraction.
 *
 * At launch (no Creators API), EditorialPriceProvider returns display:'none'
 * → no price is shown, only the "View on Amazon" CTA. Once ≥10 sales unlock the
 * Creators API, a CreatorsApiPriceProvider can be wired behind the
 * `creatorsApi.enabled` feature flag WITHOUT touching the UI.
 * See docs/ARCHITECTURE.md §6 and docs/AGENTS.md §2.
 */

export interface PriceData {
  display: "none" | "price";
  amount?: number;
  currency?: string;
  updatedAt?: Date;
  disclaimer?: string;
}

export interface PriceProvider {
  getPrice(asin: string, locale: string): Promise<PriceData>;
}

/** Launch default: never displays a price (compliant). */
export class EditorialPriceProvider implements PriceProvider {
  async getPrice(): Promise<PriceData> {
    return { display: "none" };
  }
}

/**
 * Selects the active provider from the feature flag.
 * Phase 7 will return a CreatorsApiPriceProvider when the flag is on.
 */
export function getPriceProvider(): PriceProvider {
  const enabled = process.env.CREATORS_API_ENABLED === "true";
  if (enabled) {
    // Phase 7: return new CreatorsApiPriceProvider(...)
    // Falls back to editorial until implemented to stay compliant.
    return new EditorialPriceProvider();
  }
  return new EditorialPriceProvider();
}
