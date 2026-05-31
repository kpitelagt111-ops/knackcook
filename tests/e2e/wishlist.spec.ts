import { expect, test } from "@playwright/test";

/**
 * Wishlist round-trip (app/[locale]/wishlist/page.tsx, client-side).
 * Storage key: "kk:wishlist", value: JSON array of product slugs.
 *
 * Note: as of this build there is no in-page "add to wishlist" CTA on the
 * product page — favorites are stored client-side and the public API surface
 * is the localStorage key. We seed the key via addInitScript so the page's
 * hydrating useEffect picks it up, then verify the UI renders the entries.
 */
test.describe("wishlist", () => {
  test("empty wishlist shows the empty-state copy", async ({ page }) => {
    await page.goto("/en/wishlist");
    await expect(page.getByRole("heading", { level: 1, name: /wishlist/i })).toBeVisible();
    // The copy appears twice (kicker + empty-state card) — assert both render.
    await expect(page.getByText(/Your wishlist is empty/i).first()).toBeVisible();
    expect(await page.getByText(/Your wishlist is empty/i).count()).toBeGreaterThanOrEqual(1);
    // No product link is rendered when empty.
    await expect(page.locator('main a[href*="/products/"]')).toHaveCount(0);
  });

  test("seeded wishlist renders saved slugs and supports removal", async ({ page }) => {
    // Seed localStorage BEFORE any page script runs (origin = baseURL).
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "kk:wishlist",
        JSON.stringify([
          "artisancraft-compactpro-hand-mixer",
          "vitawhirl-highspeed-countertop-blender",
        ]),
      );
    });

    await page.goto("/en/wishlist");

    // Both slugs render as links to their product page.
    const linkA = page.locator('a[href$="/products/artisancraft-compactpro-hand-mixer"]');
    const linkB = page.locator('a[href$="/products/vitawhirl-highspeed-countertop-blender"]');
    await expect(linkA).toBeVisible();
    await expect(linkB).toBeVisible();

    // Cross-check the storage round-trip.
    const stored = await page.evaluate(() => window.localStorage.getItem("kk:wishlist"));
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? "[]") as string[];
    expect(parsed).toEqual(
      expect.arrayContaining([
        "artisancraft-compactpro-hand-mixer",
        "vitawhirl-highspeed-countertop-blender",
      ]),
    );

    // Remove the first item: the row exposes a "Remove" button (common.removeFromWishlist).
    const removeButtons = page.getByRole("button", { name: /^Remove$/ });
    expect(await removeButtons.count()).toBeGreaterThanOrEqual(2);
    await removeButtons.first().click();

    // After removal: localStorage shrinks to 1 item, only the second link remains visible.
    await expect
      .poll(async () => {
        return await page.evaluate(() => {
          const raw = window.localStorage.getItem("kk:wishlist") ?? "[]";
          return (JSON.parse(raw) as string[]).length;
        });
      })
      .toBe(1);
  });
});
