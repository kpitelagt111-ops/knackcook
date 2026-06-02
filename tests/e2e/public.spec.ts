import { expect, test } from "@playwright/test";

test.describe("public site", () => {
  test("homepage / loads and shows site name", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status(), "GET / should return 2xx").toBeLessThan(400);

    // Site name appears in the header brand link.
    await expect(page.getByRole("link", { name: "KnackCook", exact: true }).first()).toBeVisible();

    // The hero H1 renders (editorial headline).
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible();
  });

  test("product page shows verdict, View on Amazon CTA with tracking href, and no $ price near CTA", async ({
    page,
  }) => {
    const response = await page.goto("/products/artisancraft-compactpro-hand-mixer");
    expect(response?.status(), "product page should return 2xx").toBeLessThan(400);

    // Editorial verdict (REQ §2.2 — our rating, never Amazon's).
    await expect(page.getByText(/Our verdict/i)).toBeVisible();

    // CTA exists and points to the tracking redirect (REQ §7 — /api/track/[asin]).
    // The redesign renders multiple CTAs (sticky + repeat strip); the first suffices.
    const cta = page.getByRole("link", { name: "View on Amazon" }).first();
    await expect(cta).toBeVisible();
    const href = await cta.getAttribute("href");
    expect(href, "CTA href").not.toBeNull();
    expect(href ?? "").toContain("/api/track/");

    // Compliance: no displayed Amazon price near the CTA (REQ §2.1).
    // We scope to the CTA's parent block (the right column) to avoid false
    // positives elsewhere on the page.
    const ctaBlock = cta.locator("xpath=ancestor::div[1]");
    await expect(ctaBlock).not.toContainText("$");
  });

  test("blog article embeds a product card linking to the product", async ({ page }) => {
    const response = await page.goto("/blog/best-stand-mixers-2026");
    expect(response?.status(), "blog page should return 2xx").toBeLessThan(400);

    // The embedded ProductCard is a link to /products/<slug> (the meaningful assertion).
    const productLink = page
      .locator('a[href*="/products/artisancraft-compactpro-hand-mixer"]')
      .first();
    await expect(productLink).toBeVisible();
  });

  test("/robots.txt returns 200 and disallows /admin", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.status()).toBe(200);
    const body = await response.text();
    expect(body).toContain("Disallow: /admin");
  });
});
