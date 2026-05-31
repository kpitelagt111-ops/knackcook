import { expect, test } from "@playwright/test";

/**
 * Search surface (Meilisearch-backed, see app/[locale]/search/page.tsx).
 * The Meilisearch index may not be populated in every environment, so this
 * test is resilient: it asserts EITHER a product link result OR the empty-
 * state copy renders without error.
 */
test.describe("public search", () => {
  test("/en/search?q=mixer returns either product results or empty-state copy", async ({
    page,
  }) => {
    const response = await page.goto("/en/search?q=mixer");
    expect(response?.status(), "search page should return 2xx").toBeLessThan(400);

    // H1 from SectionHeading.
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();

    // The search form input is always rendered (search engine UI).
    await expect(page.getByRole("searchbox").first()).toBeVisible();

    // Count product links inside <main> (excludes header/footer nav).
    const productLinks = page.locator('main a[href*="/products/"]');
    const linkCount = await productLinks.count();

    if (linkCount > 0) {
      // At least one search hit links to a product page.
      await expect(productLinks.first()).toBeVisible();
      const href = await productLinks.first().getAttribute("href");
      expect(href ?? "").toMatch(/\/en\/products\/[a-z0-9-]+/i);
    } else {
      // Empty state renders without crashing (copy contains the query).
      await expect(page.getByText(/No products match/i)).toBeVisible();
    }
  });

  test("/en/search with no query renders form + zero-state hint", async ({ page }) => {
    const response = await page.goto("/en/search");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByRole("searchbox").first()).toBeVisible();
    // No result count line is rendered when q is empty.
    await expect(page.locator("main")).not.toContainText(/results? for/i);
  });
});
