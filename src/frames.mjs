// Pull a few sharp key frames out of a short plate clip with ffmpeg (no key needed).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

/** Extract `count` frames spread over the clip into outDir; returns their paths. */
export function extractFrames(clipPath, outDir, count = 3) {
  fs.mkdirSync(outDir, { recursive: true });
  const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", clipPath]).toString().trim()) || 5;
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = ((i + 0.5) * dur) / count;
    const file = path.join(outDir, `frame-${i + 1}.jpg`);
    execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", t.toFixed(2), "-i", clipPath, "-frames:v", "1", "-q:v", "2", "-vf", "scale='min(1280,iw)':-2", file]);
    out.push(file);
  }
  return out;
}

/** Any audio/video -> mono 16 kHz 16-bit WAV for Muse Voice Transcribe. */
export function toWav16k(input, outFile) {
  execFileSync("ffmpeg", ["-y", "-v", "error", "-i", input, "-vn", "-ac", "1", "-ar", "16000", "-sample_fmt", "s16", outFile]);
  return outFile;
}
