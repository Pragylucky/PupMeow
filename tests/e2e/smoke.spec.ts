import { test, expect } from "@playwright/test";

test("landing page loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: /Delhi's pet community/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Join Pupmeow/i })).toBeVisible();
});

test("login page loads", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
  await expect(page.getByLabel("Email")).toBeVisible();
});

test("public lost & found page renders without login", async ({ page }) => {
  await page.goto("/lost");
  await expect(page.getByRole("heading", { level: 1, name: /Lost & Found/i })).toBeVisible();
  const id = process.env.E2E_LOST_ID;
  if (id) {
    await page.goto(`/lost/${id}`);
    await expect(page.getByText(/Join Pupmeow to contact/i)).toBeVisible();
  }
});

test("protected pages redirect to login", async ({ page }) => {
  await page.goto("/feed");
  await expect(page).toHaveURL(/\/login\?next=%2Ffeed/);
});
