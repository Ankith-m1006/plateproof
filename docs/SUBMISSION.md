# PlateProof: Cerebral Valley submission text (Meta Global AI Developer Hackathon, Indie track)

**Project name:** PlateProof

**One-liner:** Honest menu photos: film the plate you actually serve, get a listing-quality image that an independent auditor has checked against it.

**Live product:** https://plateproof-1037019152152.asia-south1.run.app
**Public repo:** https://github.com/Ankith-m1006/plateproof
**Demo video (2:35):** https://youtu.be/_D4LylmqDz0
**X post (Most Viral bonus):** https://x.com/ankithbuilds/status/2116077114583924790

## Problem
Small restaurants need photos to sell on delivery apps, WhatsApp and Instagram. A photoshoot costs Rs 4,000–5,000. AI images are cheap but they lie: Just Eat paused its AI menu images in October 2026 after pictures like bacon floating in cola, and Zomato banned AI dish images in 2024 after refund complaints. Nobody was checking the generated photo against the real dish.

## What it does
1. The owner uploads a photo or a 5-second clip of the real plate, and can speak the request in Telugu, Hindi or English.
2. SAM 3.1 and Muse Spark build an inventory of what is really on the plate: components, counts, colours, container.
3. Muse Spark writes a constrained prompt and Muse Image generates a candidate.
4. The candidate goes through the same eyes. An auditor running on open weights (Muse Spark Open) compares the two inventories, without ever seeing the generator's prompt, and rejects anything invented, missing or miscounted.
5. On a fail, the violation becomes the next prompt (up to 3 rounds). On a pass, the owner gets the photo, a faithfulness report in English and Telugu, and the hash of the source clip. If nothing passes, PlateProof ships nothing.
6. One click makes platform variants (Instagram story, Swiggy tile, WhatsApp catalogue), each audited again.

## How we used Meta's models
- **SAM 3.1:** counts every countable component on the real plate and on every candidate (text-prompted segmentation; boxes and masks).
- **Muse Spark 1.3:** vision inventory, prompt planning, voice-request interpretation, the agent loop.
- **Muse Image 1.0:** generates every candidate and platform variant.
- **Muse Spark Open (open weights, Baseten):** the independent auditor and the bilingual report.
- **Muse Voice Transcribe:** the owner's spoken request.

## What surprised us
Muse Image's edit endpoint turned a dosa into a chicken salad when asked to restyle it. Without the audit, that is the photo that ships. So every variant now goes through the full generate-and-audit loop instead.

## Results
- Street chicken biryani (Hyderabad): approved in round 1, 32–42 s.
- Rava masala dosa (Bengaluru): approved in round 1, 48–50 s. Before a bowl-counting fix, the auditor rejected three candidates in a row for missing sambar and chutney bowls and a missing spoon.
- Sample plates are real restaurant photos from Wikimedia Commons (CC BY-SA).

## Limits
Tested on plates with up to 5 countable components. Zomato rejects AI-generated dish images; PlateProof images are for places that allow them (own menu, WhatsApp, Instagram, Swiggy), with the report kept alongside.

## Built by
Ankith M, Hyderabad, India. Solo, Indie track. All code written during the hackathon (repo history from 30 Oct 2026).
