import { Page } from "@playwright/test";

export const DEMO = {
  admin:     { email: "admin@hireaxis.in",  password: "Password123!", home: "/admin" },
  manager:   { email: "arjun@hireaxis.in",  password: "Password123!", home: "/manager" },
  recruiter: { email: "priya@hireaxis.in",  password: "Password123!", home: "/recruiter" },
} as const;

export async function login(page: Page, role: keyof typeof DEMO) {
  const { email, password } = DEMO[role];
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  // Wait for redirect away from /login
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 10_000 });
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: /sign out/i }).click();
  await page.waitForURL("/login");
}
