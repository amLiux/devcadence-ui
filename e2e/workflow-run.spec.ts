import { test, expect } from "@playwright/test";

test("runs a workflow and sees it succeed", async ({ page }) => {
  await page.goto("/workflows");

  await page.getByText("E2E Success", { exact: true }).click();
  await expect(page).toHaveURL(/\/workflows\/editor\//);

  const testButton = page.getByRole("button", { name: "Test", exact: true });
  await expect(testButton).toBeEnabled();
  await testButton.click();

  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(/nodes passed/)).toBeVisible({ timeout: 15_000 });
  await dialog.getByRole("button", { name: "Close", exact: true }).first().click();

  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByText("Completed").first()).toBeVisible();
});
