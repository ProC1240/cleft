import { expect, test } from "@playwright/test";

test("shows a clear login path for signed-out visitors", async ({ page }) => {
  await page.route("**/api/auth/**", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) }),
  );

  await page.goto("/");
  await expect(page.getByRole("heading", { name: "cleft" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Preview demo" })).toBeVisible();
});

test("lets reviewers explore the product without authentication", async ({ page }) => {
  await page.route("**/api/auth/**", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) }),
  );
  await page.goto("/demo");

  await expect(page.getByRole("heading", { name: "Demo bill" })).toBeVisible();
  await expect(page.getByText("1,240.00 THB")).toBeVisible();
  await expect(page.getByText("620.00 THB")).toHaveCount(2);
});

test("redirects signed-out visitors away from protected pages", async ({ page }) => {
  await page.route("**/api/auth/**", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ message: "Unauthorized" }) }),
  );

  await page.goto("/items");
  await expect(page).toHaveURL("/");
});
