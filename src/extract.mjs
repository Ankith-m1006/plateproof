// Real-plate inventory: Muse Spark vision proposes components, SAM 3.1 verifies the countable ones.
import fs from "node:fs";
import path from "node:path";
import { spark, sam, toDataUrl } from "./meta.mjs";
import { INVENTORY_SCHEMA } from "./inventory.mjs";

const mimeOf = (p) => (p.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
export const countBoxes = (samText) => (samText.match(/<\|box;/g) || []).length;

/** Vision pass: structured inventory of what is on the real plate. */
export async function proposeInventory(imagePath, { hint = "" } = {}) {
  const { json, usage } = await spark({
    effort: "minimal", maxTokens: 1500, schema: INVENTORY_SCHEMA,
    messages: [
      { role: "developer", content: "You describe exactly what is visible on a real restaurant plate photo. Only list what you can see. Use short generic component names (e.g. 'chicken piece', 'raita bowl', 'lemon wedge', 'coconut chutney', 'rice'). count = number of distinct pieces you can see; 0 only for a loose spread (rice, gravy poured on the plate). Anything served in its own bowl, cup or katori is a countable component: name it '<food> bowl' (e.g. 'sambar bowl', 'coconut chutney bowl'), count the bowls, and set sam_prompt to the vessel (e.g. 'small steel bowl'). In not_present, list 3-6 things commonly served with this dish that are NOT in the photo. Reply in English." },
      { role: "user", content: [{ type: "text", text: hint ? `Owner says: "${hint}". Inventory this plate.` : "Inventory this plate." }, { type: "image_url", image_url: { url: toDataUrl(imagePath, mimeOf(imagePath)) } }] },
    ],
  });
  return { inventory: json, usage };
}

/** SAM pass: for each countable component, count instances and keep the boxes. */
export async function verifyCounts(imagePath, inventory, { log = () => {} } = {}) {
  const url = toDataUrl(imagePath, mimeOf(imagePath));
  const countable = inventory.components.filter((c) => c.count > 0);
  // One SAM call per distinct prompt; components sharing a prompt split the detections by their vision counts.
  const byPrompt = new Map();
  for (const c of countable) { const k = (c.sam_prompt || c.name).toLowerCase(); if (!byPrompt.has(k)) byPrompt.set(k, []); byPrompt.get(k).push(c); }
  const samTotals = new Map();
  for (const [k, group] of byPrompt) {
    try { const { text } = await sam({ text: k, imageDataUrl: url }); samTotals.set(k, countBoxes(text)); log(`SAM "${k}": vision ${group.reduce((a, c) => a + c.count, 0)}, sam ${samTotals.get(k)}${group.length > 1 ? ` (shared by ${group.map((c) => c.name).join(" + ")})` : ""}`); }
    catch (e) { log(`SAM "${k}" failed: ${e.message.slice(0, 120)}`); }
  }
  return { ...inventory, components: inventory.components.map((c) => {
    if (c.count <= 0) return { ...c, sam_count: null };
    const k = (c.sam_prompt || c.name).toLowerCase(); const group = byPrompt.get(k); const total = samTotals.get(k);
    if (total == null || total === 0) return { ...c, sam_count: total ?? null, count_source: "vision" };
    if (group.length === 1) return { ...c, sam_count: total, count: total, count_source: "sam-3.1" };
    const visionSum = group.reduce((a, g) => a + g.count, 0);
    const share = Math.max(1, Math.round((total * c.count) / visionSum));
    return { ...c, sam_count: total, count: visionSum === total ? c.count : share, count_source: visionSum === total ? "sam-3.1 (shared total matches vision)" : "sam-3.1 (shared total, split by vision)" };
  }) };
}

export async function extractInventory(imagePath, opts = {}) {
  const { inventory } = await proposeInventory(imagePath, opts);
  return verifyCounts(imagePath, inventory, opts);
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"))) {
  const img = process.argv[2];
  const inv = await extractInventory(img, { log: console.log });
  const dir = path.join("runs", path.basename(img, path.extname(img))); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "inventory.json"), JSON.stringify(inv, null, 2));
  console.log(JSON.stringify(inv, null, 1));
}
