import { expect, test } from "@playwright/test";

test("search, plan, route fallback and incomplete weather work through the real API", async ({ page }, testInfo) => {
  await page.clock.install();
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));
  await page.goto("/app/context");
  await expect(page.getByRole("heading", { name: "Plan your departure." })).toBeVisible();
  await expect(page.getByText("3 live signals", { exact: true })).toHaveCount(0);
  for (const [legend, query] of [["Starting point", "Bengaluru"], ["Destination", "Mysuru"]]) {
    const fieldset = page.getByRole("group", { name: legend, exact: true });
    await fieldset.getByLabel("Search city or place").fill(query);
    await fieldset.getByRole("button", { name: "Find locations" }).click();
    await fieldset.getByRole("button", { name: `${query}, Test fixture` }).click();
  }
  const eventAt = new Date(Date.now() + 3 * 3600_000);
  const localDate = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(eventAt).replace(" ", "T");
  await page.getByLabel("Event starts (your device’s local time)").fill(localDate);
  await page.getByLabel("Journey estimate / fallback (minutes)").fill("35");
  await page.getByLabel("Request a driving estimate", { exact: false }).check();
  await page.getByRole("button", { name: "Prepare departure plan" }).click();
  const result = page.getByRole("region", { name: "Departure plan" });
  await expect(result).toBeFocused();
  await expect(result.getByText("Driving estimate unavailable; using your entered journey time.")).toBeVisible();
  await expect(result.getByText("Consider an umbrella.")).toBeVisible();
  await expect(result.getByText("Suggested plan · no actions executed")).toBeVisible();
  await expect(result.getByText("24°C · 65% rain probability", { exact: true })).toHaveCount(2);
  // Time differences are independent of locale formatting and cross-midnight display.
  const times = await result.locator("ol strong").allTextContents();
  expect(times).toHaveLength(4);
  await page.getByLabel("origin latitude", { exact: true }).fill("0");
  await expect(result).toHaveCount(0); // Changing any input invalidates the old result.
  await page.getByRole("button", { name: "Prepare departure plan" }).click();
  await expect(result.getByText("Weather coverage is incomplete. Check conditions before travelling.")).toBeVisible();
  await expect(result.getByText("No usable weather forecast for this travel window.")).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("departure-plan.png") });
  await page.clock.fastForward(6 * 60_000);
  await expect(result.getByRole("status")).toHaveText("This plan needs refreshing. Its forecast refresh time has passed.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(pageErrors).toEqual([]);
});

test("the bridge rejects unknown operations, malformed JSON and invalid inputs", async ({ request }) => {
  expect((await request.post("/api/public-context/unknown", { data: {} })).status()).toBe(404);
  expect((await request.post("/api/public-context/search", { data: "{" })).status()).toBe(400);
  const invalid = await request.post("/api/public-context/plan", { data: { event_at: "bad" } });
  expect(invalid.status()).toBe(422);
  expect((await invalid.json()).error.requestId).toBeTruthy();
});
