// Day-1 probes: confirms each Meta endpoint works before the real build. Run: node --env-file=.env scripts/probe-api.mjs [image.jpg]
import fs from "node:fs";
import { spark, museImage, sam, toDataUrl } from "../src/meta.mjs";

const img = process.argv[2];
const step = async (name, fn) => {
  const t = Date.now();
  try { const r = await fn(); console.log(`OK   ${name} (${Date.now() - t} ms)`, typeof r === "string" ? r.slice(0, 300) : ""); }
  catch (e) { console.log(`FAIL ${name}: ${e.message.slice(0, 400)}`); }
};

await step("spark structured output", async () => {
  const { json } = await spark({
    messages: [{ role: "user", content: "Dish: chicken biryani with raita and two lemon wedges. List components." }],
    schema: { name: "inv", schema: { type: "object", additionalProperties: false, properties: { components: { type: "array", items: { type: "string" } } }, required: ["components"] } },
  });
  return JSON.stringify(json);
});

await step("muse image", async () => {
  const [png] = await museImage({ prompt: "overhead photo of chicken biryani on a white plate, one bowl of raita, two lemon wedges, soft daylight" });
  fs.mkdirSync("runs", { recursive: true }); fs.writeFileSync("runs/probe.png", png);
  return `wrote runs/probe.png (${png.length} bytes)`;
});

if (img) {
  await step("sam 3.1 image", async () => {
    const { text } = await sam({ text: "chicken piece", imageDataUrl: toDataUrl(img, "image/jpeg") });
    return text;
  });
  await step("spark vision on same image", async () => {
    const { msg } = await spark({ messages: [{ role: "user", content: [{ type: "text", text: "List every food component on this plate with counts and colours as JSON." }, { type: "image_url", image_url: { url: toDataUrl(img, "image/jpeg") } }] }], maxTokens: 500 });
    return msg.content;
  });
} else console.log("skip SAM/vision probes (pass an image path to run them)");
