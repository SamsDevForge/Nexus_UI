// Run against an already-started local frontend: node scripts/capture-ui-review.mjs before
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const stage = process.argv[2];
if (!["before", "after"].includes(stage)) throw new Error("Choose before or after.");
const base = process.argv[3] || "http://127.0.0.1:3102";
const directory = path.resolve("ui-review", stage);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: process.env.NEXUS_E2E_BROWSER_CHANNEL || "msedge" });
const records = [];
try {
  for (const [name, width, height] of [["desktop",1440,900], ["laptop",1280,720], ["mobile",390,844]]) {
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: "reduce", timezoneId: "Asia/Kolkata" });
    const page = await context.newPage();
    for (const [route, slug] of [["/app/today","today"], ["/app/today?scenario=empty","today-empty"], ["/app/calendar","calendar"], ["/app/mail","mail"], ["/app/notifications","notifications"], ["/app/context","commute"]]) {
      await page.goto(base + route);
      await page.locator("h1").first().waitFor();
      await page.waitForLoadState("networkidle");
      if (slug === "mail") await page.getByRole("heading", { name: "3 messages to consider", exact: true }).waitFor();
      if (slug === "calendar") await page.locator(".calendar-agenda").waitFor();
      if (slug === "notifications") await page.locator(".notification-schedule").waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: path.join(directory, `${name}-${slug}.png`) });
      records.push({ route, viewport: {width,height}, screenshot: `${name}-${slug}.png`, ...await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        navigationHeight: document.querySelector(".mobile-navigation")?.getBoundingClientRect().height || 0,
        heading: document.querySelector("h1")?.textContent,
      })) });
    }
    if (name === "desktop") {
      await page.goto(base); await page.locator("h1").first().waitFor();
      await page.screenshot({ path: path.join(directory, "desktop-landing.png") });
    }
    await context.close();
  }
  await writeFile(path.join(directory, "capture.json"), JSON.stringify({ capturedAt: new Date().toISOString(), stage, records }, null, 2));
  console.log(`Captured ${records.length} product views plus landing in ${directory}`);
} finally { await browser.close(); }
