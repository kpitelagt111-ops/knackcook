import { expect, type Page, test } from "@playwright/test";

const SUPER_ADMIN = {
  email: "admin@knackcook.com",
  password: "Admin12345!",
} as const;

const EDITOR = {
  email: "editor@knackcook.com",
  password: "Editor12345!",
} as const;

async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto("/admin/login");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Password" }).fill(password);
  await Promise.all([
    page.waitForURL((url) => !url.pathname.startsWith("/admin/login"), { timeout: 15_000 }),
    page.getByRole("button", { name: "Sign in", exact: true }).click(),
  ]);
}

test.describe("admin auth & RBAC", () => {
  // Each test gets a fresh storage context to keep them independent.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated /admin redirects to /admin/login", async ({ page }) => {
    const response = await page.goto("/admin");
    expect(response?.status(), "should ultimately land on a page").toBeLessThan(400);
    await expect(page).toHaveURL(/\/admin\/login(\?|$)/);
    // The login form renders (copy-independent: assert the inputs exist).
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Password" })).toBeVisible();
  });

  test("SUPER_ADMIN login reaches /admin and shows SUPER_ADMIN role", async ({ page }) => {
    await login(page, SUPER_ADMIN.email, SUPER_ADMIN.password);

    await expect(page).toHaveURL(/\/admin(\/|$|\?)/);
    await expect(page).not.toHaveURL(/\/admin\/login/);

    // Dashboard renders the user's role (shown as "SUPER ADMIN" / "SUPER_ADMIN").
    await expect(page.getByText(/SUPER.?ADMIN/i).first()).toBeVisible();
  });

  test("EDITOR cannot reach /admin/settings but can reach /admin/products", async ({ page }) => {
    await login(page, EDITOR.email, EDITOR.password);
    await expect(page).not.toHaveURL(/\/admin\/login/);

    // /admin/settings is SUPER_ADMIN only — guard redirects to /admin?error=forbidden.
    await page.goto("/admin/settings");
    await expect(page).toHaveURL(/\/admin(?:\/?)(?:\?error=forbidden)?$/);
    expect(page.url()).not.toMatch(/\/admin\/settings(?:\/?$|\?)/);

    // /admin/products requires EDITOR — the editor must reach it.
    await page.goto("/admin/products");
    await expect(page).toHaveURL(/\/admin\/products(\?|$)/);
    await expect(page.getByRole("heading", { name: /Products/i }).first()).toBeVisible();
  });
});
