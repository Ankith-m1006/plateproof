# PlateProof

**Honest menu photos.** Film the plate you actually serve. PlateProof turns it into a listing-quality image, and refuses to show you one that does not match your plate.

**Live:** https://plateproof-1037019152152.asia-south1.run.app

**Demo video:** https://youtu.be/_D4LylmqDz0

Built for the Meta Global AI Developer Hackathon (Indie track), Oct–Nov 2026, by Ankith M, Hyderabad.

## Why

Small restaurants need photos to sell on Swiggy, WhatsApp and Instagram. A photoshoot costs Rs 4,000–5,000 per session. AI images are cheap, but they lie: Just Eat paused its AI menu images in October 2026 after pictures like bacon floating in cola, and Zomato banned AI dish images in 2024 after refund complaints. The problem was never "AI photo". It was "nobody checked it against the real dish".

PlateProof checks. Every image comes with a faithfulness report, the audit rounds that produced it, and the hash of the source clip.

## How it works

```
real plate photo / 5 s clip
   │
   ├─ Muse Spark (vision) proposes the inventory: components, counts, colours, container
   ├─ SAM 3.1 counts every countable component (text-prompted segmentation)   ← the eyes
   │
   ▼  plate inventory (ground truth)
Muse Spark plans a constrained prompt  →  Muse Image generates a candidate
   │
   ├─ the candidate goes through the SAME eyes (Spark vision + SAM 3.1)
   ├─ Muse Spark Open (open weights, on Baseten) audits REAL vs CANDIDATE   ← the judge
   │     never sees the generator prompt; returns invented / missing / count mismatches,
   │     a one-line fix instruction, and a report in English and Telugu
   │
   └─ FAIL → re-prompt with the violation (max 3 rounds)   PASS → approved photo + report + source hash
```

The owner can drive it by voice in Telugu, Hindi or English: **Muse Voice Transcribe** hears "chicken biryani photo for Swiggy, white plate, our gravy is darker", and Muse Spark turns that into the style and corrections.

### What makes it honest

- The auditor is a different model on open weights, and it is given only the two inventories. It cannot be talked into passing by the generator's prompt.
- Counts come from SAM 3.1 segmentation, not from the language model's impression.
- If no candidate passes in 3 rounds, PlateProof ships nothing. The failed rounds are kept and shown.
- Prices, text and claims are never put into images.

## Meta models used

| model | role |
|---|---|
| `sam-3.1` | counts components on the real plate and on every candidate (boxes + masks) |
| `muse-spark-1.3` | vision inventory, prompt planning, voice-request interpretation, agent loop |
| `muse-image-1.0` | generates each candidate |
| `meta-models/muse-spark-open` (Baseten) | independent auditor on open weights, writes the EN/TE report |
| `muse-voice-transcribe-1.0` | owner's spoken request (te/hi/en) |

## Run it

```bash
pnpm install
cp .env.example .env     # MODEL_API_KEY from https://dev.meta.ai/api-keys/, BASETEN_API_KEY
pnpm start               # http://localhost:8787
pnpm test
```

CLI: `node --env-file=.env src/generate.mjs samples/dosa.jpg` writes everything to `runs/dosa/` (real inventory, every candidate, every verdict, `result.json`).

Needs Node 20.17+ and `ffmpeg` on PATH (for clips and voice).

## Results on the three sample plates

Sample photos are real restaurant plates from Wikimedia Commons (CC BY-SA, see `samples/SOURCES.md`).

| plate | real inventory (SAM-counted) | rounds | result |
|---|---|---|---|
| Street chicken biryani, Hyderabad | rice, 3 chicken pieces, red plate | 1 | approved, 42 s |
| Rava masala dosa, Bengaluru | 1 dosa, 1 sambar bowl, 1 coconut chutney bowl, banana leaf, spoon | 1 | approved, 48–50 s |
| Andhra bhojanam (20+ items) | 19 components found | — | not run through the loop yet; included to show where the inventory gets dense |

Before the bowl-counting fix, the dosa run failed three times in a row: the auditor caught the missing sambar and chutney bowls twice and a missing spoon once. Those rounds are the reason the audit exists.

## Limits

- Tested on plates with up to 5 countable components; busy thalis with 20 items are untested and will likely need more rounds.
- SAM 3.1 is prompted with short noun phrases; two components in identical vessels are split by the vision count.
- Platform policy: Zomato rejects AI-generated dish images. Use PlateProof images where they are allowed, and keep the report with them.
- A photo is approved against the plate in the clip you gave it, on that day. Change the plating, film it again.

## Licence

MIT. Copyright (c) 2026 Ankith M.
