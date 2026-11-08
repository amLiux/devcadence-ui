import { test, expect } from "@playwright/test";

test("failed run shows its error and sends the notification", async ({ page, request }) => {
  const response = await request.post("/api/webhooks/e2e-webhook", {
    data: { event: "e2e" },
  });
  expect(response.ok()).toBeTruthy();

  const payload = (await response.json()) as {
    results?: Array<{ success: boolean; runId: string }>;
  };
  expect(payload.results?.[0]?.success).toBe(false);

  await expect
    .poll(
      async () => {
        const mail = await request.get("http://127.0.0.1:8025/api/v2/messages");
        const data = (await mail.json()) as {
          items?: Array<{ Content?: { Headers?: unknown } }>;
        };
        return (data.items ?? []).some((item) =>
          JSON.stringify(item.Content?.Headers ?? {}).includes("e2e@devdock.local"),
        );
      },
      { timeout: 10_000 },
    )
    .toBe(true);

  await page.goto("/workflows");
  await page.getByText("E2E Failure", { exact: true }).click();
  await page.getByRole("button", { name: "History", exact: true }).click();
  await expect(page.getByText(/fetch failed|Failed|ECONNREFUSED/i).first()).toBeVisible();
});
