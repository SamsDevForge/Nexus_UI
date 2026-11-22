import { expect, test } from "@playwright/test";

test("workspaces keep readable hierarchy, usable actions and complete mobile navigation", async ({ page }, testInfo) => {
  // Test navigation independently of GPU startup; cube-enabled visual captures are separate.
  await page.context().addCookies([{ name: "nexus-focus-mode", value: "on", url: "http://127.0.0.1:3101" }]);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const sizes = testInfo.project.name === "mobile" ? [{ width: 390, height: 844 }] : [{ width: 1280, height: 720 }, { width: 1440, height: 900 }];
  for (const viewport of sizes) {
    await page.setViewportSize(viewport);
    for (const [route, ready] of [["calendar", ".calendar-agenda"], ["mail", ".mail-queue"], ["collaboration", ".collaboration-library"], ["notifications", ".notification-schedule"], ["context", ".commute-form"]]) {
      await page.goto(`/app/${route}`);
      await page.waitForLoadState("networkidle");
      await expect(page.locator(ready)).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      expect(await page.evaluate(() => {
        const main = document.querySelector(".product-main")!;
        return document.documentElement.scrollWidth <= innerWidth && main.scrollWidth <= main.clientWidth + 1;
      })).toBe(true);
      const title = await page.getByRole("heading", { level: 1 }).boundingBox();
      expect(title && title.y + title.height < 350).toBeTruthy();
      await page.screenshot({ path: testInfo.outputPath(`${viewport.width}-${route}.png`) });
    }
  }
  await page.goto("/app/calendar");
  await page.getByRole("button", { name: "Add event", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Add something of your own", exact: true })).toBeFocused();
  await page.getByLabel("Event title", { exact: true }).fill("Keep my draft");
  const day = await page.getByLabel("Week starting").inputValue();
  await page.getByLabel("Starts", { exact: true }).fill(`${day}T11:00`);
  await page.getByLabel("Ends", { exact: true }).fill(`${day}T10:00`);
  await page.getByRole("button", { name: "Add sample event", exact: true }).click();
  await expect(page.locator(".calendar-page").getByRole("alert")).toHaveText("Choose an end after the start.");
  await page.locator(".calendar-page").getByRole("alert").scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath("calendar-validation-error.png") });
  page.once("dialog", dialog => dialog.dismiss());
  await page.getByRole("button", { name: "Close event editor", exact: true }).click();
  await expect(page.getByLabel("Event title", { exact: true })).toHaveValue("Keep my draft");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Close event editor", exact: true }).click();
  await expect(page.getByLabel("Event title", { exact: true })).toHaveCount(0);
  if (testInfo.project.name === "mobile") {
    await page.goto("/app/notifications?scenario=empty");
    const dock = page.getByRole("navigation", { name: "Primary product navigation", exact: true });
    expect((await dock.boundingBox())!.height).toBeLessThanOrEqual(72);
    await expect(dock.getByRole("link")).toHaveCount(4);
    const more = dock.getByRole("button", { name: "More", exact: true });
    const box = await more.boundingBox(); expect(box!.width >= 44 && box!.height >= 44).toBe(true);
    await more.click();
    const menu = page.getByRole("dialog", { name: "Where to next?", exact: true });
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("button", { name: "Close navigation" })).toBeFocused();
    await expect(menu.getByRole("link")).toHaveCount(16);
    await page.keyboard.press("Shift+Tab");
    await expect(menu.getByRole("link", { name: "Technicals", exact: true })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(menu.getByRole("button", { name: "Close navigation" })).toBeFocused();
    await page.screenshot({ path: testInfo.outputPath("more-navigation.png") });
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
    await expect(more).toBeFocused();
    await more.click();
    await menu.getByRole("link", { name: "Settings", exact: false }).click();
    await expect(page).toHaveURL(/\/app\/settings\?scenario=empty$/);
    await expect(page.locator("#nexus-main-content")).toBeFocused();
    await expect(menu).not.toBeVisible();
  }
  expect(errors).toEqual([]);
});
