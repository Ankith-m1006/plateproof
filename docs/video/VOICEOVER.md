# PlateProof: 3-minute demo voiceover (read this, record as one MP3)

Read at a calm, normal pace. Each block matches what is on screen at that time; the times are where each block should START. If you finish a block early, just pause before the next one; I fit the video to your audio. Total about 2 min 40 s.

---

**[0:00, title: two headlines]**
Last week, Just Eat had to stop using AI menu photos. One showed bacon floating in a glass of cola. Two years ago, Zomato banned AI dish images after customers complained. Small restaurants still need good photos. Nobody was checking them.

**[0:18, PlateProof title]**
This is PlateProof. It makes an honest menu photo of the dish you actually serve, and it refuses to show you one that doesn't match your plate.

**[0:28, the app, picking the street biryani]**
Here is a real plate of chicken biryani from a street stall in Hyderabad. I pick it and ask for the photo.

**[0:36, "What is really on the plate" fills in]**
First, PlateProof looks at the real plate. Muse Spark lists what it sees, and SAM 3.1 counts every piece: rice, three pieces of chicken, a red plate. It also writes down what is not on the plate, like raita or a lemon, so nothing gets added.

**[0:55, the loop: candidate appears with PASSED]**
Then Muse Image makes a candidate. The candidate goes through the same eyes, and an independent auditor running on open weights, Muse Spark Open, compares the two lists. It never sees the prompt, so it can't be talked into a pass. This one matches: three pieces, red plate, nothing invented.

**[1:15, approved photo and the report]**
The owner gets the photo, a short report in English and in Telugu, and a fingerprint of the original photo, so anyone can check where it came from.

**[1:28, card: the dosa that failed twice]**
It doesn't always pass. Here is a rava dosa served with sambar and chutney. The first image dropped both bowls. Rejected. The next one forgot the spoon. Rejected. Each time, the auditor's reason goes straight back into the next prompt, until the picture matches the plate. If nothing passes in three rounds, PlateProof ships nothing.

**[1:55, the app: Instagram story variant]**
One click makes the same plate for other places: an Instagram story, a Swiggy tile, a WhatsApp catalogue. Every version is audited again.

**[2:10, card: the chicken salad]**
Why audit every version? Because when I asked an image editor to just restyle this dosa, it sent back a chicken salad. Without the audit, that is the photo that ships.

**[2:25, card: Meta models + links]**
PlateProof uses SAM 3.1, Muse Spark, Muse Image, Muse Spark Open and Muse Voice. It is live and open source. Honest photos for honest kitchens.
