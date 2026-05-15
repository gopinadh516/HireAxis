import { test, expect } from "@playwright/test";
import { login } from "./helpers";

// ── Manager talent list ───────────────────────────────────────────────────────

test("manager talents page loads with search", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/manager/talents");
  await expect(page.getByPlaceholder(/search/i)).toBeVisible();
});

test("manager talents page has Add Talent button", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/manager/talents");
  await expect(page.getByRole("link", { name: /add talent/i })).toBeVisible();
});

test("manager talent tabs switch without error", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/manager/talents");
  // Click through all tabs
  for (const label of ["Shortlisted", "Rejected", "Sourced"]) {
    const tab = page.getByText(label);
    if (await tab.count() > 0) {
      await tab.click();
      await page.waitForTimeout(300);
      await expect(page.locator("main")).toBeVisible();
    }
  }
});

// ── Add talent form ───────────────────────────────────────────────────────────

test("manager add talent form renders required fields", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/manager/talents/new");
  await expect(page.getByLabel(/first name/i).or(page.getByPlaceholder(/first name/i))).toBeVisible();
  await expect(page.getByLabel(/email/i).or(page.getByPlaceholder(/email/i))).toBeVisible();
});

// ── Recruiter talent list ─────────────────────────────────────────────────────

test("recruiter talents page loads", async ({ page }) => {
  await login(page, "recruiter");
  await page.goto("/recruiter/talents");
  await expect(page.getByText(/talent/i)).toBeVisible();
});

test("recruiter add talent form renders", async ({ page }) => {
  await login(page, "recruiter");
  await page.goto("/recruiter/talents/new");
  await expect(page.getByText(/add talent/i)).toBeVisible();
});

// ── Talent detail page ────────────────────────────────────────────────────────

test("manager talent detail loads from list click", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/manager/talents");
  const firstTalent = page.locator(".cursor-pointer").first();
  const count = await firstTalent.count();
  if (count > 0) {
    await firstTalent.click();
    await expect(page).toHaveURL(/\/manager\/talents\/.+/);
  }
});
