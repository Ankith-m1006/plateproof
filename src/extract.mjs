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
      { role: "developer", content: "You describe exactly what is visible on a real restaurant plate photo. Only list what you can see. Use short generic component names (e.g. 'chicken piece', 'raita bowl', 'lemon wedge', 'coconut chutney', 'rice'). count = number of distinct pieces you can see; 0 if it is a spread or uncountable. In not_present, list 3-6 things commonly served with this dish that are NOT in the photo. Reply in English." },
      { role: "user", content: [{ type: "text", text: hint ? `Owner says: "${hint}". Inventory this plate.` : "Inventory this plate." }, { type: "image_url", image_url: { url: toDataUrl(imagePath, mimeOf(imagePath)) } }] },
    ],
  });
  return { inventory: json, usage };
}

/** SAM pass: for each countable component, count instances and keep the boxes. */
export async function verifyCounts(imagePath, inventory, { log = () => {} } = {}) {
  const url = toDataUrl(imagePath, mimeOf(imagePath));
  const out = [];
  for (const c of inventory.components) {
    if (c.count <= 0) { out.push({ ...c, sam_count: null }); continue; }
    try {
      const { text } = await sam({ text: c.sam_prompt || c.name, imageDataUrl: url });
      const n = countBoxes(text);
      log(`SAM "${c.sam_prompt || c.name}": vision ${c.count}, sam ${n}`);
      out.push({ ...c, sam_count: n, count: n > 0 ? n : c.count, count_source: n > 0 ? "sam-3.1" : "vision" });
    } catch (e) { log(`SAM "${c.name}" failed: ${e.message.slice(0, 120)}`); out.push({ ...c, sam_count: null, count_source: "vision" }); }
  }
  return { ...inventory, components: out };
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
