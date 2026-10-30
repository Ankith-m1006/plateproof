// Owner speaks (Telugu/Hindi/English) -> Muse Voice Transcribe -> Muse Spark turns it into a shoot request.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { transcribe, spark } from "./meta.mjs";
import { toWav16k } from "./frames.mjs";

const REQ_SCHEMA = { name: "shoot_request", schema: { type: "object", additionalProperties: false, properties: {
  dish_hint: { type: "string" }, style: { type: "string" }, platform: { type: "string" }, corrections: { type: "string" }, language: { type: "string" }, echo: { type: "string" } },
  required: ["dish_hint", "style", "platform", "corrections", "language", "echo"] } };

export async function transcribeAny(inputPath) {
  const wav = path.join(os.tmpdir(), `pp-${Date.now()}.wav`);
  toWav16k(inputPath, wav);
  try {
    const res = await transcribe(wav);
    const text = res.transcript ?? res.text ?? (Array.isArray(res.turns) ? res.turns.map((t) => t.text || t.transcript).join(" ") : JSON.stringify(res));
    return { text, raw: res };
  } finally { fs.rmSync(wav, { force: true }); }
}

export async function interpretRequest(text) {
  const { json } = await spark({ effort: "minimal", maxTokens: 1200, schema: REQ_SCHEMA, messages: [
    { role: "developer", content: "A restaurant owner spoke a request about a menu photo, possibly in Telugu, Hindi or English (code-switched). Extract: dish_hint (what dish they say it is, in English, or empty), style (photo style words, in English; default 'clean overhead menu photo, soft daylight, neutral background'), platform (swiggy/own menu/whatsapp/instagram/other), corrections (anything they say about how the dish really looks, e.g. 'gravy is darker', in English), language (ISO code of what they spoke), echo (one short sentence in the owner's own language confirming what you understood)." },
    { role: "user", content: text } ] });
  return json;
}
