import { test, expect } from "@playwright/test";

test("moves a workflow to another project", async ({ page }) => {
  await page.goto("/workflows");

  await page.getByRole("button", { name: "Move E2E Move" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Project").selectOption({ label: "E2E Target" });
  await dialog.getByRole("button", { name: "Move", exact: true }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: /E2E Target/ }).click();
  await expect(page.getByText("E2E Move", { exact: true })).toBeVisible();
});
