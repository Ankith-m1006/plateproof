import { createRequire } from "node:module"; import path from "node:path";
const require = createRequire(import.meta.url);
const { chromium } = require("C:/Users/ankit/.vscode/extensions/danielsanmedium.dscodegpt-3.24.79/standalone/node_modules/patchright");
const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const b = await chromium.launch({ headless: true, channel: "chrome" }); const p = await (await b.newContext({ viewport: { width: 1280, height: 720 } })).newPage();
await p.goto("file:///" + path.join(here, "cards", "c5.html").split(path.sep).join("/")); await p.waitForTimeout(1500);
await p.screenshot({ path: path.join(here, "card5.png") }); await b.close(); console.log("card5 ok");
