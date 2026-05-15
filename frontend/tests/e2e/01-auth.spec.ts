import { test, expect } from "@playwright/test";
import { login, logout, DEMO } from "./helpers";

// ── Root redirect ─────────────────────────────────────────────────────────────

test("GET / redirects to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");
});

// ── Login page UI ─────────────────────────────────────────────────────────────

test("login page renders email + password fields", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
});

test("login page renders 3 demo account buttons", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByText("Super Admin")).toBeVisible();
  await expect(page.getByText("Manager")).toBeVisible();
  await expect(page.getByText("Recruiter")).toBeVisible();
});

test("invalid credentials shows error toast", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "wrong@hireaxis.in");
  await page.fill('input[type="password"]', "wrongpass");
  await page.click('button[type="submit"]');
  await expect(page.getByText(/invalid|credentials|password/i)).toBeVisible({ timeout: 8_000 });
});

// ── Role-based login redirects ────────────────────────────────────────────────

test("super_admin login redirects to /admin", async ({ page }) => {
  await login(page, "admin");
  await expect(page).toHaveURL(/\/admin/);
});

test("manager login redirects to /manager", async ({ page }) => {
  await login(page, "manager");
  await expect(page).toHaveURL(/\/manager/);
});

test("recruiter login redirects to /recruiter", async ({ page }) => {
  await login(page, "recruiter");
  await expect(page).toHaveURL(/\/recruiter/);
});

// ── Demo account quick-login buttons ─────────────────────────────────────────

test("demo Manager button signs in and redirects to /manager", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /manager/i }).click();
  await page.waitForURL(/\/manager/, { timeout: 10_000 });
  await expect(page).toHaveURL(/\/manager/);
});

test("demo Recruiter button signs in and redirects to /recruiter", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /recruiter/i }).click();
  await page.waitForURL(/\/recruiter/, { timeout: 10_000 });
  await expect(page).toHaveURL(/\/recruiter/);
});

// ── Logout ────────────────────────────────────────────────────────────────────

test("logout clears session and redirects to /login", async ({ page }) => {
  await login(page, "manager");
  await logout(page);
  await expect(page).toHaveURL("/login");
});

// ── Protected route guards ────────────────────────────────────────────────────

test("unauthenticated visit to /manager redirects to /login", async ({ page }) => {
  await page.goto("/manager");
  await expect(page).toHaveURL("/login");
});

test("unauthenticated visit to /recruiter redirects to /login", async ({ page }) => {
  await page.goto("/recruiter");
  await expect(page).toHaveURL("/login");
});

test("unauthenticated visit to /admin redirects to /login", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL("/login");
});

// ── Cross-role access guards ──────────────────────────────────────────────────

test("manager visiting /recruiter is redirected to /manager", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/recruiter");
  await expect(page).toHaveURL(/\/manager/);
});

test("manager visiting /admin is redirected to /manager", async ({ page }) => {
  await login(page, "manager");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/manager/);
});

test("recruiter visiting /manager is redirected to /recruiter", async ({ page }) => {
  await login(page, "recruiter");
  await page.goto("/manager");
  await expect(page).toHaveURL(/\/recruiter/);
});

test("recruiter visiting /admin is redirected to /recruiter", async ({ page }) => {
  await login(page, "recruiter");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/recruiter/);
});

test("super_admin can visit /admin, /manager, and /recruiter", async ({ page }) => {
  await login(page, "admin");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin/);
  await page.goto("/manager");
  await expect(page).toHaveURL(/\/manager/);
  await page.goto("/recruiter");
  await expect(page).toHaveURL(/\/recruiter/);
});
