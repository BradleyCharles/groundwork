import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

// Public, non-API routes are read from the site map so a new page cannot be forgotten.
function publicRoutes(): string[] {
  const map = readFileSync("docs/technical-map/02-site-map.md", "utf8");
  return [...map.matchAll(/^\|\s*`(\/[^`]*)`\s*\|\s*Public\s*\|/gm)].map((m) => m[1] as string);
}

const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

test("site map lists at least one public route", () => {
  expect(publicRoutes().length).toBeGreaterThan(0);
});

for (const route of publicRoutes()) {
  test(`axe: no violations on ${route}`, async ({ page }) => {
    const cspViolations: string[] = [];
    page.on("console", (msg) => {
      if (/content security policy/i.test(msg.text())) cspViolations.push(msg.text());
    });
    await page.goto(route);
    const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    expect(cspViolations).toEqual([]);
  });

  test(`skip link is the first focusable element on ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
  });
}

test("login form shows an accessible error state", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.test");
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  // Next adds its own hidden role="alert" route announcer after a submit, so match the message text.
  const alert = page.getByRole("alert").filter({ hasText: "Email or password is incorrect." });
  await expect(alert).toBeVisible();
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
});
