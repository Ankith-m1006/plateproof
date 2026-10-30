// Thin client for the Meta Model API (OpenAI-compatible) and Baseten (Muse Spark Open).
import fs from "node:fs";

const BASE = process.env.META_BASE_URL || "https://api.meta.ai/v1";
const KEY = () => {
  const k = process.env.MODEL_API_KEY;
  if (!k) throw new Error("MODEL_API_KEY missing (put it in .env)");
  return k;
};

async function postJson(path, body, { base = BASE, key = KEY() } = {}) {
  const r = await fetch(base + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${path} ${r.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

/** Muse Spark chat with optional JSON schema output. */
export async function spark({ messages, schema, tools, model = "muse-spark-1.3", effort = "low", maxTokens = 800 }) {
  const body = { model, messages, reasoning_effort: effort, max_completion_tokens: maxTokens };
  if (schema) body.response_format = { type: "json_schema", json_schema: { name: schema.name, schema: schema.schema } };
  if (tools) body.tools = tools;
  const res = await postJson("/chat/completions", body);
  const msg = res.choices[0].message;
  return { msg, usage: res.usage, json: schema && msg.content ? JSON.parse(msg.content) : undefined };
}

/** Muse Image generation -> Buffer (png). */
export async function museImage({ prompt, size = "1024x1024", n = 1, model = "muse-image-1.0" }) {
  const res = await postJson("/images/generations", { model, prompt, n, size, output_format: "png", response_format: "b64_json" });
  return res.data.map((d) => Buffer.from(d.b64_json, "base64"));
}

/** Muse Voice Transcribe, file mode. wavPath must be mono 16-bit PCM 16k/24k. */
export async function transcribe(wavPath, { languageBias = ["te", "hi", "en"], mode = "ENDPOINTING" } = {}) {
  const form = new FormData();
  form.append("request", new Blob([JSON.stringify({ model: "muse-voice-transcribe-1.0", mode, languageBias })], { type: "application/json" }));
  form.append("audio", new Blob([fs.readFileSync(wavPath)], { type: "audio/wav" }), "audio.wav");
  const r = await fetch(BASE + "/asr/transcribe", { method: "POST", headers: { Authorization: `Bearer ${KEY()}`, Accept: "application/json" }, body: form });
  const text = await r.text();
  if (!r.ok) throw new Error(`/asr/transcribe ${r.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

/** SAM 3.1 via /responses (non-streaming). Returns raw output text with box/mask tokens. */
export async function sam({ text, imageDataUrl, videoDataUrl, model = "sam-3.1" }) {
  const content = [{ type: "input_text", text }];
  if (imageDataUrl) content.push({ type: "input_image", image_url: imageDataUrl });
  if (videoDataUrl) content.push({ type: "input_video", video_url: videoDataUrl });
  const res = await postJson("/responses", { model, input: [{ role: "user", content }] });
  const out = (res.output || []).flatMap((o) => o.content || []).map((c) => c.text || "").join("");
  return { raw: res, text: out || res.output_text || "" };
}

/** Independent auditor on open weights (Baseten, Muse Spark Open). */
export async function sparkOpen({ messages, schema, maxTokens = 600 }) {
  const key = process.env.BASETEN_API_KEY;
  if (!key) throw new Error("BASETEN_API_KEY missing");
  const body = { model: "meta-models/muse-spark-open", messages, max_tokens: maxTokens };
  if (schema) body.response_format = { type: "json_schema", json_schema: { name: schema.name, schema: schema.schema } };
  const res = await postJson("/chat/completions", body, { base: "https://inference.baseten.co/v1", key });
  const msg = res.choices[0].message;
  return { msg, json: schema && msg.content ? JSON.parse(msg.content) : undefined };
}

export const toDataUrl = (path, mime) => `data:${mime};base64,${fs.readFileSync(path).toString("base64")}`;
