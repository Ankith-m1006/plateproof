// The PlateProof loop: real inventory -> constrained prompt -> Muse Image -> SAM + vision inventory of the
// candidate -> independent audit on Muse Spark Open (open weights) -> fix instruction -> repeat or accept.
import fs from "node:fs";
import path from "node:path";
import { spark, museImage, sparkOpen } from "./meta.mjs";
import { extractInventory } from "./extract.mjs";
import { sha256 } from "./frames.mjs";

const PROMPT_SCHEMA = { name: "shoot_prompt", schema: { type: "object", additionalProperties: false,
  properties: { prompt: { type: "string" }, must_not_appear: { type: "array", items: { type: "string" } } }, required: ["prompt", "must_not_appear"] } };

export async function buildPrompt(real, { style = "clean overhead menu photo, soft daylight, neutral background", fix = "" } = {}) {
  const { json } = await spark({ effort: "minimal", maxTokens: 2000, schema: PROMPT_SCHEMA, messages: [
    { role: "developer", content: "You write prompts for a food image generator. Hard rule: the image must contain exactly the listed components with the listed counts and colours, in the listed container, and nothing else edible. Never add garnish, sides, drinks or cutlery that are not listed. State every count explicitly in words (e.g. 'exactly three pieces of chicken'). Keep the prompt under 120 words." },
    { role: "user", content: `Real plate inventory (ground truth):\n${JSON.stringify(real)}\nStyle: ${style}\n${fix ? `The previous attempt failed this audit, fix it: ${fix}` : ""}` } ] });
  return json;
}

const AUDIT_SCHEMA = { name: "audit", schema: { type: "object", additionalProperties: false, properties: {
  pass: { type: "boolean" },
  invented: { type: "array", items: { type: "string" } },
  missing: { type: "array", items: { type: "string" } },
  count_mismatch: { type: "array", items: { type: "object", additionalProperties: false, properties: { component: { type: "string" }, real: { type: "integer" }, candidate: { type: "integer" } }, required: ["component", "real", "candidate"] } },
  colour_or_container_issues: { type: "array", items: { type: "string" } },
  fix_instruction: { type: "string" },
  report_en: { type: "string" },
  report_te: { type: "string" } },
  required: ["pass", "invented", "missing", "count_mismatch", "colour_or_container_issues", "fix_instruction", "report_en", "report_te"] } };

/** Independent auditor. It never sees the generator prompt: only the two inventories (SAM-counted). */
export async function audit(real, candidate) {
  const { json } = await sparkOpen({ schema: AUDIT_SCHEMA, messages: [
    { role: "system", content: "You are an independent auditor for restaurant menu photos. You get the inventory of the REAL plate and the inventory of a GENERATED candidate image, both produced by the same vision + segmentation pipeline. Match components by meaning (plural/singular and synonyms are the same thing; 'rice' and 'biryani rice' match). Rules: any edible component in the candidate that is not on the real plate = invented. Any real component absent from the candidate = missing. For countable components (count > 0 on both) counts must be equal; trust fields with count_source 'sam-3.1' most. Container type must match. pass is true only if invented, missing and count_mismatch are all empty and the container matches. fix_instruction: one imperative sentence for the image generator naming each violation. report_en: 2-3 plain sentences a restaurant owner understands. report_te: the same in Telugu." },
    { role: "user", content: `REAL:\n${JSON.stringify(real)}\n\nCANDIDATE:\n${JSON.stringify(candidate)}` } ] });
  return json;
}

export async function runLoop(imagePath, { style, maxRounds = 3, log = () => {}, outDir } = {}) {
  const name = path.basename(imagePath, path.extname(imagePath));
  outDir ||= path.join("runs", name); fs.mkdirSync(outDir, { recursive: true });
  const started = Date.now();
  log("inventory of the real plate…");
  const real = await extractInventory(imagePath, { log });
  fs.writeFileSync(path.join(outDir, "real-inventory.json"), JSON.stringify(real, null, 2));
  const rounds = []; let fix = "";
  for (let r = 1; r <= maxRounds; r++) {
    const spec = await buildPrompt(real, { style, fix });
    log(`round ${r}: generating… (${spec.prompt.slice(0, 90)}…)`);
    const [png] = await museImage({ prompt: `${spec.prompt} Do not include: ${spec.must_not_appear.join(", ")}.` });
    const candPath = path.join(outDir, `candidate-${r}.png`); fs.writeFileSync(candPath, png);
    log(`round ${r}: auditing…`);
    const cand = await extractInventory(candPath, { log });
    const verdict = await audit(real, cand);
    rounds.push({ round: r, prompt: spec, candidate: candPath, candidate_inventory: cand, verdict });
    fs.writeFileSync(path.join(outDir, `round-${r}.json`), JSON.stringify(rounds[r - 1], null, 2));
    log(`round ${r}: ${verdict.pass ? "PASS" : "FAIL"} invented=${verdict.invented.join("|")} missing=${verdict.missing.join("|")} counts=${JSON.stringify(verdict.count_mismatch)}`);
    if (verdict.pass) break;
    fix = verdict.fix_instruction;
  }
  const final = rounds[rounds.length - 1];
  const result = { source: imagePath, source_sha256: sha256(imagePath), real, rounds: rounds.length, accepted: final.verdict.pass, image: final.verdict.pass ? final.candidate : null,
    report_en: final.verdict.report_en, report_te: final.verdict.report_te, seconds: Math.round((Date.now() - started) / 1000), models: { eyes: "sam-3.1 + muse-spark-1.3", generator: "muse-image-1.0", auditor: "muse-spark-open (Baseten)" } };
  fs.writeFileSync(path.join(outDir, "result.json"), JSON.stringify(result, null, 2));
  return result;
}

if (process.argv[2]) {
  const res = await runLoop(process.argv[2], { log: console.log, style: process.argv[3] });
  console.log(JSON.stringify({ accepted: res.accepted, rounds: res.rounds, seconds: res.seconds, image: res.image, report_en: res.report_en }, null, 1));
}
