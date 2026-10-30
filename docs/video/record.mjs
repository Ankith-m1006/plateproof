import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/ankit/.vscode/extensions/danielsanmedium.dscodegpt-3.24.79/standalone/node_modules/patchright");
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const browser = await chromium.launch({ headless: true, channel: "chrome" });

// 1) cards -> PNG
const cardCtx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
const cp = await cardCtx.newPage();
for (const n of [1, 2, 3, 4, 5]) {
  await cp.goto("file:///" + path.join(here, "cards", `c${n}.html`).split(path.sep).join("/"));
  await cp.waitForTimeout(1500);
  await cp.screenshot({ path: path.join(here, `card${n}.png`) });
}
await cardCtx.close();

// 2) live app recording
const vdir = path.join(here, "raw"); fs.mkdirSync(vdir, { recursive: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: vdir, size: { width: 1280, height: 720 } } });
const page = await ctx.newPage();
const t0 = Date.now(); const marks = {}; const mark = (k) => (marks[k] = (Date.now() - t0) / 1000);
await page.goto(process.env.APP || "https://plateproof-1037019152152.asia-south1.run.app/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500); mark("loaded");
await page.getByText("Street biryani, Hyderabad").click(); mark("picked");
await page.waitForTimeout(2500);
await page.getByText("Make the honest photo").click(); mark("run");
await page.locator("#realInv li").first().waitFor({ timeout: 120000 }); mark("inventory");
await page.waitForTimeout(1500);
await page.locator("#realPanel").scrollIntoViewIfNeeded();
await page.locator(".round").first().waitFor({ timeout: 240000 }); mark("round");
await page.locator(".round").first().scrollIntoViewIfNeeded(); await page.waitForFunction(() => [...document.querySelectorAll("img")].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(3500);
await page.waitForFunction(() => /done in|error/.test(document.querySelector("#status").textContent), null, { timeout: 240000 }); mark("done");
await page.locator("#finalFrame").scrollIntoViewIfNeeded(); await page.waitForFunction(() => [...document.querySelectorAll("img")].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 60000 }).catch(() => {}); await page.waitForTimeout(6000); mark("report");
await page.getByText("Instagram story 9:16").click(); mark("variant");
await page.locator("#variantStrip").scrollIntoViewIfNeeded();
await page.waitForFunction(() => !document.querySelector("[data-variant=story]").disabled, null, { timeout: 300000 }); await page.waitForFunction(() => [...document.querySelectorAll("img")].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 60000 }).catch(() => {}); mark("variantDone");
await page.waitForTimeout(4000); mark("end");
const video = page.video(); await ctx.close();
const raw = await video.path();
fs.writeFileSync(path.join(here, "marks.json"), JSON.stringify({ raw, marks }, null, 2));
console.log(JSON.stringify({ raw, marks }));
await browser.close();
