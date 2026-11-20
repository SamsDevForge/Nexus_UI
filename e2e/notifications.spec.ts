import { expect, test } from "@playwright/test";

test("notification demo explains its boundary, edits schedules and renders a sample without sending", async ({ page }, testInfo) => {
  if (process.env.CI) await page.context().addCookies([
    { name: "nexus-focus-mode", value: "on", url: "http://127.0.0.1:3101" },
  ]);
  const errors: string[] = [];
  const notificationCalls: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (request.url().includes("/api/v1/notifications")) notificationCalls.push(request.url()); });
  await page.goto("/app/notifications");
  await expect(page.getByText("Your inbox is quiet.", { exact: true })).toBeVisible();
  await expect(page.getByText(/^Demonstration mode\. Changes/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Enable browser push" })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath("notification-settings.png") });
  await page.getByLabel("Morning brief", { exact: true }).check();
  await page.getByLabel("Morning time").fill("08:30");
  await page.getByRole("button", { name: "Update sample preferences" }).click();
  await expect(page.getByText("Sample preferences updated for this screen.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show a sample brief" }).click();
  await expect(page.getByRole("heading", { name: "Sample morning brief" })).toBeVisible();
  await page.getByText("Why this brief?", { exact: true }).click();
  await expect(page.getByText("Demonstration data", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Mark as read" }).click();
  await expect(page.getByRole("button", { name: "Mark as read" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  if (testInfo.project.name === "mobile") {
    const sizes = await page.getByRole("navigation", { name: "Primary product navigation" }).getByRole("link")
      .evaluateAll(nodes => nodes.map(node => ({ width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height })));
    expect(sizes.every(size => size.width >= 44 && size.height >= 44)).toBe(true);
    const capture = await page.locator(".quick-capture-launcher").boundingBox();
    const navigation = await page.getByRole("navigation", { name: "Primary product navigation" }).boundingBox();
    expect(capture && navigation && capture.y + capture.height < navigation.y).toBeTruthy();
  }
  await page.screenshot({ path: testInfo.outputPath("notifications.png") });
  expect(notificationCalls).toEqual([]);
  expect(errors).toEqual([]);
  await page.reload();
  await expect(page.getByText("Your inbox is quiet.", { exact: true })).toBeVisible();
});
