import { test, expect } from "@playwright/test";

test("creates, edits and deletes a connection without rendering the secret", async ({ page }) => {
  const secret = "xoxb-e2e-secret-value";

  await page.goto("/connections");
  await page.getByRole("button", { name: "Add Connection" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: /Slack/ }).click();
  await dialog.getByLabel("Name").fill("E2E Slack");
  await dialog.getByLabel("Bot Token").fill(secret);
  await dialog.getByRole("button", { name: "Connect", exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText("E2E Slack", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Edit E2E Slack" }).click();
  const editDialog = page.getByRole("dialog");
  const token = editDialog.getByLabel("Bot Token");
  await expect(token).toHaveValue("");
  await expect(token).toHaveAttribute("placeholder", "Saved — leave blank to keep");
  await expect(page.getByText(secret)).toHaveCount(0);
  await editDialog.getByRole("button", { name: "Cancel" }).click();

  await page.getByRole("button", { name: "Delete E2E Slack" }).click();
  await expect(page.getByText("E2E Slack", { exact: true })).toHaveCount(0);
});
