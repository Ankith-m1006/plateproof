import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { runLoop, runVariant, VARIANTS } from "./generate.mjs";
import { extractFrames } from "./frames.mjs";
import { transcribeAny, interpretRequest } from "./voice.mjs";

const PORT = Number(process.env.PORT || 8787);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const RUNS = path.join(ROOT, "runs"); fs.mkdirSync(RUNS, { recursive: true });
const jobs = new Map(); // id -> { events: [], done, result, listeners:Set }
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".jpg": "image/jpeg", ".json": "application/json", ".svg": "image/svg+xml", ".md": "text/plain" };

const readBody = (req) => new Promise((res, rej) => { const c = []; req.on("data", (d) => c.push(d)); req.on("end", () => res(Buffer.concat(c))); req.on("error", rej); });
const json = (res, code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
const emit = (job, ev) => { job.events.push(ev); for (const l of job.listeners) l(ev); };

async function startJob({ dataUrl, filename, style, hint, corrections }) {
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const dir = path.join(RUNS, id); fs.mkdirSync(dir, { recursive: true });
  const m = /^data:([^;]+);base64,(.+)$/s.exec(dataUrl); if (!m) throw new Error("bad data url");
  const ext = m[1].startsWith("video/") ? ".mp4" : m[1] === "image/png" ? ".png" : ".jpg";
  let source = path.join(dir, "source" + ext); fs.writeFileSync(source, Buffer.from(m[2], "base64"));
  if (ext === ".mp4") { const frames = extractFrames(source, dir, 3); source = frames[1]; }
  const job = { id, events: [], done: false, result: null, error: null, listeners: new Set(), source: `/runs/${id}/${path.basename(source)}` };
  jobs.set(id, job);
  const fullStyle = [style, corrections ? `The real dish looks like this: ${corrections}.` : ""].filter(Boolean).join(" ");
  runLoop(source, { outDir: dir, style: fullStyle || undefined, hint, log: (msg) => emit(job, { type: "log", msg, t: Date.now() }), onRound: (r) => emit(job, { type: "round", ...r }) })
    .then((result) => { job.result = { ...result, image: result.image ? `/runs/${id}/${path.basename(result.image)}` : null, source: job.source }; job.done = true; emit(job, { type: "done", result: job.result }); })
    .catch((e) => { job.error = e.message; job.done = true; emit(job, { type: "error", msg: e.message }); });
  return job;
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://x");
    if (req.method === "POST" && url.pathname === "/api/run") {
      const body = JSON.parse((await readBody(req)).toString());
      const job = await startJob(body);
      return json(res, 200, { id: job.id, source: job.source });
    }
    if (req.method === "POST" && url.pathname === "/api/variant") {
      const { id, key } = JSON.parse((await readBody(req)).toString());
      const job = jobs.get(id); if (!job || !job.result?.accepted) return json(res, 400, { error: "no approved photo for this job" });
      if (!VARIANTS[key]) return json(res, 400, { error: "unknown variant" });
      const dir = path.join(RUNS, id); const src = path.join(ROOT, job.source);
      const vjob = { id: `${id}:${key}`, events: [], done: false, result: null, error: null, listeners: new Set() }; jobs.set(vjob.id, vjob);
      runVariant(src, job.result.real, key, { outDir: dir, log: (msg) => emit(vjob, { type: "log", msg }), onRound: (r) => emit(vjob, { type: "round", ...r, variant: key }) })
        .then((r) => { vjob.result = { ...r, image: r.image ? `/runs/${id}/${path.basename(r.image)}` : null, variant: key }; vjob.done = true; emit(vjob, { type: "done", result: vjob.result }); })
        .catch((e) => { vjob.error = e.message; vjob.done = true; emit(vjob, { type: "error", msg: e.message }); });
      return json(res, 200, { id: vjob.id });
    }
    if (req.method === "POST" && url.pathname === "/api/voice") {
      const body = JSON.parse((await readBody(req)).toString());
      const m = /^data:([^;]+);base64,(.+)$/s.exec(body.dataUrl); if (!m) return json(res, 400, { error: "bad audio" });
      const tmp = path.join(RUNS, `voice-${Date.now()}.webm`); fs.writeFileSync(tmp, Buffer.from(m[2], "base64"));
      try { const { text } = await transcribeAny(tmp); const req2 = await interpretRequest(text); return json(res, 200, { text, request: req2 }); }
      finally { fs.rmSync(tmp, { force: true }); }
    }
    if (url.pathname.startsWith("/api/events/")) {
      const job = jobs.get(decodeURIComponent(url.pathname.slice("/api/events/".length))); if (!job) return json(res, 404, { error: "no job" });
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
      const send = (ev) => res.write(`data: ${JSON.stringify(ev)}\n\n`);
      job.events.forEach(send); if (job.done) return res.end();
      job.listeners.add(send); req.on("close", () => job.listeners.delete(send)); return;
    }
    if (url.pathname.startsWith("/api/job/")) { const job = jobs.get(url.pathname.split("/").pop()); return job ? json(res, 200, { done: job.done, result: job.result, error: job.error }) : json(res, 404, {}); }
    // static
    let file = url.pathname === "/" ? "/public/index.html" : url.pathname;
    if (!file.startsWith("/runs/") && !file.startsWith("/samples/")) file = "/public" + file.replace(/^\/public/, "");
    const abs = path.join(ROOT, file); if (!abs.startsWith(ROOT) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) { res.writeHead(404); return res.end("not found"); }
    res.writeHead(200, { "Content-Type": MIME[path.extname(abs)] || "application/octet-stream", "Cache-Control": "no-cache" }); fs.createReadStream(abs).pipe(res);
  } catch (e) { json(res, 500, { error: e.message }); }
}).listen(PORT, () => console.log(`PlateProof on http://localhost:${PORT}`));
