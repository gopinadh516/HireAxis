import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test.beforeEach(async ({ page }) => {
  await login(page, "manager");
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

test("manager dashboard loads with sidebar", async ({ page }) => {
  await expect(page.getByText("HireAxis")).toBeVisible();
  await expect(page.getByText("Manager", { exact: false })).toBeVisible();
});

test("manager sidebar has all nav links", async ({ page }) => {
  await expect(page.getByRole("link", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Jobs" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Talents" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Approvals" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Notifications" })).toBeVisible();
});

test("manager sidebar shows user name and role", async ({ page }) => {
  // Sidebar footer shows logged-in user name
  await expect(page.locator("aside").getByText(/manager/i)).toBeVisible();
});

// ── Jobs page ─────────────────────────────────────────────────────────────────

test("manager jobs page loads with status tabs", async ({ page }) => {
  await page.goto("/manager/jobs");
  await expect(page.getByRole("tab", { name: /all/i }).or(page.getByText("All"))).toBeVisible();
  await expect(page.getByText("Pending")).toBeVisible();
  await expect(page.getByText("Active")).toBeVisible();
});

test("manager jobs page has Post Job link", async ({ page }) => {
  await page.goto("/manager/jobs");
  await expect(page.getByRole("link", { name: /post job/i })).toBeVisible();
});

test("manager can open new job form", async ({ page }) => {
  await page.goto("/manager/jobs/new");
  await expect(page.getByRole("heading", { name: /post a job/i }).or(page.getByText("Post a Job"))).toBeVisible();
});

// ── Talents page ──────────────────────────────────────────────────────────────

test("manager talents page loads with tabs", async ({ page }) => {
  await page.goto("/manager/talents");
  await expect(page.getByText("All")).toBeVisible();
});

test("manager can open new talent form", async ({ page }) => {
  await page.goto("/manager/talents/new");
  await expect(page.getByText(/add talent/i)).toBeVisible();
});

// ── Approvals page ────────────────────────────────────────────────────────────

test("manager approvals page loads", async ({ page }) => {
  await page.goto("/manager/approvals");
  await expect(page.getByText(/approval/i)).toBeVisible();
});

// ── Profile ───────────────────────────────────────────────────────────────────

test("manager profile page loads", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByText(/profile/i)).toBeVisible();
  await expect(page.locator('input[disabled]')).toBeVisible(); // email field is read-only
});

test("manager profile shows email as read-only", async ({ page }) => {
  await page.goto("/profile");
  const emailInput = page.locator('input[disabled]');
  await expect(emailInput).toHaveValue(/hireaxis\.in/);
});
