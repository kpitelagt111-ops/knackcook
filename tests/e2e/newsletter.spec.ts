import { expect, test } from "@playwright/test";

/**
 * Newsletter signup (components/newsletter-form.tsx → POST /api/newsletter).
 * The real endpoint persists to the DB and triggers an n8n webhook — neither
 * is desirable in E2E. We intercept the network call and assert the UI
 * transitions to the expected post-submit state for each branch.
 *
 * NewsletterForm is rendered in the footer (site-chrome.tsx), so it appears
 * on every public page.
 */
test.describe("newsletter form", () => {
  test("successful pending submission shows the 'check your inbox' confirmation", async ({
    page,
  }) => {
    await page.route("**/api/newsletter", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, status: "pending" }),
      });
    });

    await page.goto("/en");

    // The form lives in the footer — scroll into view to ensure it is hydrated.
    const emailInput = page.locator("#newsletter-email");
    await emailInput.scrollIntoViewIfNeeded();
    await emailInput.fill("e2e-test@example.com");

    // The submit button label matches the t("submit") string in messages/en.json.
    const submitButton = page
      .getByRole("button", { name: /^Subscribe$/i })
      // The footer button is the form's; pick the one inside a <form>.
      .filter({ has: page.locator("xpath=ancestor::form") })
      .first();
    await submitButton.click();

    // After the mocked 200 + status=pending, the form swaps for a confirmation paragraph.
    await expect(page.getByText(/Check your inbox to confirm/i)).toBeVisible();
  });

  test("already-confirmed response shows the 'already subscribed' message", async ({ page }) => {
    await page.route("**/api/newsletter", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, status: "already_confirmed" }),
      });
    });

    await page.goto("/en");
    const emailInput = page.locator("#newsletter-email");
    await emailInput.scrollIntoViewIfNeeded();
    await emailInput.fill("repeat@example.com");

    await page
      .getByRole("button", { name: /^Subscribe$/i })
      .filter({ has: page.locator("xpath=ancestor::form") })
      .first()
      .click();

    await expect(page.getByText(/already subscribed/i)).toBeVisible();
  });

  test("server error response surfaces the inline error message", async ({ page }) => {
    await page.route("**/api/newsletter", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ success: false, error: "invalid email" }),
      });
    });

    await page.goto("/en");
    const emailInput = page.locator("#newsletter-email");
    await emailInput.scrollIntoViewIfNeeded();
    await emailInput.fill("not-an-email");

    await page
      .getByRole("button", { name: /^Subscribe$/i })
      .filter({ has: page.locator("xpath=ancestor::form") })
      .first()
      .click();

    await expect(page.getByText(/Something went wrong/i)).toBeVisible();
  });
});
