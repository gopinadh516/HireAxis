import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.beforeEach(async ({ page }) => {
  await login(page, "recruiter");
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

test("recruiter dashboard loads", async ({ page }) => {
  await expect(page.getByText("HireAxis")).toBeVisible();
  await expect(page.locator("aside")).toBeVisible();
});

test("recruiter sidebar shows only recruiter nav items", async ({ page }) => {
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "My Jobs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Talents" })).toBeVisible();
  // Approvals should NOT be in recruiter nav
  await expect(page.getByRole("link", { name: "Approvals" })).not.toBeVisible();
});

// ── Jobs page ─────────────────────────────────────────────────────────────────

test("recruiter jobs page loads", async ({ page }) => {
  await page.goto("/recruiter/jobs");
  await expect(page.getByText(/my jobs/i)).toBeVisible();
});

test("recruiter jobs page has Post Job button", async ({ page }) => {
  await page.goto("/recruiter/jobs");
  await expect(page.getByRole("link", { name: /post job/i })).toBeVisible();
});

test("recruiter can open new job form", async ({ page }) => {
  await page.goto("/recruiter/jobs/new");
  await expect(page.getByText(/post a job/i)).toBeVisible();
});

// ── Talents page ──────────────────────────────────────────────────────────────

test("recruiter talents page loads", async ({ page }) => {
  await page.goto("/recruiter/talents");
  await expect(page.getByText(/talent/i)).toBeVisible();
});

test("recruiter can open new talent form", async ({ page }) => {
  await page.goto("/recruiter/talents/new");
  await expect(page.getByText(/add talent/i)).toBeVisible();
});

// ── Profile ───────────────────────────────────────────────────────────────────

test("recruiter profile page loads", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByText(/profile/i)).toBeVisible();
});

// ── Public post-job page (no auth) ────────────────────────────────────────────

test("public post-job page loads without authentication", async ({ page, context }) => {
  // Clear cookies to simulate unauthenticated session
  await context.clearCookies();
  await page.goto("/post-job");
  // Should NOT redirect to login — post-job is a public route
  await expect(page).not.toHaveURL("/login");
  await expect(page.getByText(/post a job|submit/i)).toBeVisible();
});
