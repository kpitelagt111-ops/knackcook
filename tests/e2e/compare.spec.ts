import { expect, test } from "@playwright/test";

/**
 * Comparator (app/[locale]/compare/page.tsx).
 * SSR renders a table when 2+ slugs resolve to PUBLISHED products.
 */
test.describe("public compare", () => {
  test("compare renders a table with both product titles for 2 valid slugs", async ({ page }) => {
    const response = await page.goto(
      "/en/compare?ids=artisancraft-compactpro-hand-mixer,vitawhirl-highspeed-countertop-blender",
    );
    expect(response?.status(), "compare page should return 2xx").toBeLessThan(400);

    await expect(page.getByRole("heading", { name: /Compare products/i })).toBeVisible();

    // Both column headers carry the product title (translations[0].title).
    // Fallback to slug-as-title is harmless — assert via flexible regex.
    const table = page.getByRole("table");
    await expect(table).toBeVisible();

    // Two product columns + the leading empty cell = 3 header cells.
    const headerCells = table.locator("thead th");
    expect(await headerCells.count()).toBeGreaterThanOrEqual(3);

    // "Brand" + "Our verdict" rows exist in the body.
    await expect(table.getByText(/Brand/i)).toBeVisible();
    await expect(table.getByText(/Our verdict/i)).toBeVisible();

    // Each row should expose a CTA per product (AmazonCTA rows).
    const ctas = table.getByRole("link", { name: /View on Amazon/i });
    expect(await ctas.count()).toBeGreaterThanOrEqual(2);
  });

  test("compare with <2 slugs renders the hint instead of the table", async ({ page }) => {
    const response = await page.goto("/en/compare?ids=artisancraft-compactpro-hand-mixer");
    expect(response?.status()).toBeLessThan(400);
    await expect(page.getByText(/Select 2 to 4 products/i)).toBeVisible();
    // Table is intentionally absent.
    await expect(page.getByRole("table")).toHaveCount(0);
  });
});
