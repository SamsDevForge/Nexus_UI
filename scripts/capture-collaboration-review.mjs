import { chromium } from "@playwright/test";
import { mkdir,writeFile } from "node:fs/promises";
import path from "node:path";

const base = process.argv[2] || "http://127.0.0.1:3102";
const directory = path.resolve("ui-review","collaboration");
await mkdir(directory,{ recursive:true });
const browser = await chromium.launch({ channel:process.env.NEXUS_E2E_BROWSER_CHANNEL || "msedge" });
const records = [];
try {
  for (const [name,width,height] of [["desktop",1440,900],["laptop",1280,720],["mobile",390,844]]) {
    const context = await browser.newContext({ viewport:{ width,height },reducedMotion:"reduce",timezoneId:"Asia/Kolkata" });
    const page = await context.newPage(), errors = [];
    page.on("pageerror",error => errors.push(error.message));
    const response = await page.goto(base+"/app/collaboration");
    if (response?.status() !== 200) throw new Error("Preview did not return HTTP 200.");
    await page.getByRole("button",{ name:/Before the next field visit/ }).waitFor();
    await page.waitForLoadState("networkidle"); await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path:path.join(directory,`${name}-reading.png`) });
    await page.getByRole("button",{ name:/Before the next field visit/ }).click();
    await page.getByRole("button",{ name:"Prepare note draft",exact:true }).click();
    await page.getByRole("heading",{ name:"Review before publishing.",exact:true }).evaluate(e => e.scrollIntoView({block:"start"}));
    await page.screenshot({ path:path.join(directory,`${name}-note.png`) });
    await page.getByRole("heading",{ name:"Choose what comes in.",exact:true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path:path.join(directory,`${name}-permissions.png`) });
    records.push({ name,width,height,status:response.status(),errors,...await page.evaluate(() => ({ overflow:document.documentElement.scrollWidth > innerWidth,headings:document.querySelectorAll("h1").length,cube:!!document.querySelector(".product-landing-cube-canvas") })) });
    await context.close();
  }
  await writeFile(path.join(directory,"capture.json"),JSON.stringify(records,null,2));
  console.log(JSON.stringify(records));
} finally { await browser.close(); }
