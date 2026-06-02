import { appendFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const REPORT_PATH = join(process.cwd(), "test-results", "a11y-violations.ndjson");
mkdirSync(dirname(REPORT_PATH), { recursive: true });

/**
 * Public pages to scan. Admin (dashboard) is auth-gated and out of scope,
 * but /admin/login is publicly reachable.
 */
const PAGES = [
  "/",
  "/blog",
  "/blog/best-stand-mixers-2026",
  "/products/artisancraft-compactpro-hand-mixer",
  "/category/stand-mixers",
  "/compare",
  "/search",
  "/wishlist",
  "/affiliate-disclosure",
  "/legal/privacy",
  "/legal/cookies",
  "/legal/notice",
  "/admin/login",
] as const;

type Theme = "light" | "dark";
const THEMES: readonly Theme[] = ["light", "dark"] as const;

/**
 * Seed the theme via localStorage on the page's origin BEFORE navigating, so
 * the no-flash bootstrap script picks it up on first paint.
 */
async function seedTheme(page: Page, theme: Theme): Promise<void> {
  await page.addInitScript((value: Theme) => {
    try {
      window.localStorage.setItem("theme", value);
    } catch {
      /* localStorage may be unavailable in some contexts */
    }
  }, theme);
}

for (const url of PAGES) {
  for (const theme of THEMES) {
    test(`a11y: ${url} [${theme}] has no serious/critical violations`, async ({ page }) => {
      await seedTheme(page, theme);

      const response = await page.goto(url);
      expect(response, `${url} should respond`).not.toBeNull();
      expect(response?.status(), `${url} should return < 400`).toBeLessThan(400);

      // Wait for hydration + theme application.
      // Using domcontentloaded + small delay instead of networkidle, which
      // can hang in production builds with Sentry tunnel or long-lived connections.
      await page.waitForLoadState("domcontentloaded");
      await page.waitForTimeout(500);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const blocking = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );

      if (blocking.length > 0) {
        for (const v of blocking) {
          for (const n of v.nodes) {
            appendFileSync(
              REPORT_PATH,
              `${JSON.stringify({
                url,
                theme,
                id: v.id,
                impact: v.impact,
                target: n.target,
                html: n.html,
                failureSummary: n.failureSummary,
              })}\n`,
            );
          }
        }
        const summary = blocking.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          nodes: v.nodes.length,
        }));
        console.error(`[a11y] ${url} [${theme}] violations:\n${JSON.stringify(summary, null, 2)}`);
      }

      expect(blocking, `serious/critical axe violations on ${url} [${theme}]`).toEqual([]);
    });
  }
}
