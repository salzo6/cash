# Base Evaluation Prompts — Maya v3

Copy-paste-ready prompts for the v3 base-selection session. **Maya LoRA is NOT loaded** for any of these — we're testing raw base capability and prompt-following before committing to the v3 training base.

Companion file: `base_evaluation_results.md` — fill that in as you go.

For the framework / decision criteria see `V3_PLANNING.md`. For production prompts (with LoRA) see `prompt_library.md`.

---

## How to use this file

**Order: scenario-by-scenario, all bases per scenario.** This makes comparative scoring much easier (30 images of the same scenario side-by-side reveals patterns that model-by-model order hides).

1. Pick a scenario. Apply the per-base swap and run on each of the 5 bases. **5–8 images per base, random seeds.** ~30 images per scenario.
2. Score each base for that scenario in `base_evaluation_results.md` (1–5 scale + one-line notes per cell).
3. Add per-scenario cross-model observations to `base_evaluation_results.md` (which base "felt" best for this scenario, surprising fingerprints, etc.).
4. Move to the next scenario.
5. After all 5 scenarios done, fill in the decision section.

Total: 5 scenarios × 5 bases × ~6 images = ~150 images. Plan ~2–3 hours.

---

## Universal pieces

### Settings (use for every prompt)

- **Sampler:** DPM++ 2M Karras
- **Steps:** 28
- **CFG:** 5
- **Resolution:** specified per scenario (most are 832×1216 portrait; full-body scenarios use 768×1344)

### Identity sketch (use in every prompt)

Generic young-woman descriptor that's loosely Maya-shaped — enough that the comparison across bases is visually fair, not so specific that we're back to needing the LoRA:

```
young woman, jet black hair, fair skin, brown eyes
```

Do NOT use `mayacole_persona` or the v2 preamble. The whole point is testing the base alone.

### Per-base swaps

| Base | Token to add to prompt | Notes |
|---|---|---|
| gonzalomoXLFluxPony_v40 | `gonzalomo-amateur,` (lead with it) | Pony hybrid — needs its activator token |
| Juggernaut XL v9 | (none) | |
| RealVisXL v4 | (none) | |
| Lustify | (none) | SDXL 1.0 derivative, no Pony tags needed |
| miamodel | (none) | |

### Negative prompt (default — use unless scenario says otherwise)

```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands
```

---

## Scenario 1 — Modest IG selfie, fully clothed

**What we're testing:** does the base honor explicit "modest / fully clothed" prompts, or does it over-render skin? This is gonzalomo's known pain point.

**Resolution:** 832 × 1216

**Prompt:**
```
amateur photo, photorealistic, selfie, 24mm lens, upper body, indoor bedroom, young woman, jet black hair, fair skin, brown eyes, wearing oversized grey hoodie zipped up to neck, fully clothed, modest, no skin showing below neck, soft natural window light, slight smile, looking at camera
```

**Negative (enhanced — adds modesty enforcement):**
```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands, nude, naked, topless, cleavage, exposed breasts, exposed skin, low neckline, partially undressed
```

**Pass criteria:**
- ✅ Hoodie present, zipped, no cleavage / chest visible
- ✅ Recognizable as a modest IG-style selfie
- ❌ Hoodie open / chest visible / "implied nudity" framing
- ❌ Outfit is anything other than what was prompted

If a base fails this even with the enhanced negative, it's a hard rule-out for tier-2 IG content.

---

## Scenario 2 — Full body shot, standing, casual

**What we're testing:** does the base actually render head-to-toe, or does it default to upper-body crop / cut off legs?

**Resolution:** 768 × 1344 (taller aspect = more demanding test)

**Prompt:**
```
amateur photo, photorealistic, full body shot, head to toe visible, entire body in frame, photographed from across the street, young woman, jet black hair, fair skin, wearing fitted black turtleneck and blue jeans, standing on sidewalk, casual stance, candid, looking ahead not at camera, overcast lighting, urban background, wide framing
```

**Negative:** default

**Pass criteria** (check each per image):

*Framing (the headline test):*
- ✅ Full body visible — head, torso, legs, AND feet all in frame
- ❌ Cropped at thighs / knees / ankles / toes
- ❌ Subject zoomed in / framing default to upper-body despite explicit instructions
- ❌ Selfie framing (this is a **3rd-person photo**, NOT a selfie)
- *Note: camera distance ("across the street") is logged but NOT scored — all SDXL bases tested ignore it; this is an ecosystem limitation, not a base differentiator*

*Outfit:*
- ✅ Wearing fitted black turtleneck AND blue jeans (both items, both as described)
- ❌ Different top (e.g., t-shirt, hoodie, dress)
- ❌ Different bottoms (e.g., shorts, skirt, leggings)

*Pose & gaze:*
- ✅ Standing upright, casual stance
- ✅ Looking ahead (NOT at camera) — candid feel
- ❌ Walking / sitting / lying despite "standing" prompt
- ❌ Looking directly at camera (defeats the candid intent)

*Setting:*
- ✅ Outdoor sidewalk / urban background
- ❌ Indoor / studio / non-urban setting

*Lighting:*
- ✅ Overcast / soft diffuse light
- ❌ Strong direct sun / golden hour / artificial lighting

*Anatomy:*
- ✅ Two arms, two legs, all fingers, no spurious limbs
- ✅ Face is anatomically normal (eyes aligned, no warping)
- ❌ Missing or extra limbs / fingers
- ❌ Distorted face

*Aesthetic (qualitative — not a hard fail but logged):*
- Does it look like a real candid photo or like an AI-generated stock image?
- Does the urban background hold together (signage, vehicles, people in distance) or break down?

If a base systematically fails the headline framing test (full-body), it's a hard rule-out for production — we need full-body shots for IG variety.

---

## Scenario 3 — Tier-2 mirror selfie

**What we're testing:** complex composition handling — hands holding phone, mirror reflection, casual pose. This is high-frequency IG content.

**Resolution:** 832 × 1216

**Prompt:**
```
amateur photo, photorealistic, mirror selfie, bathroom mirror, holding iphone in hand, full body visible in mirror, young woman, jet black hair, fair skin, wearing white tank top and grey sweatpants, harsh overhead vanity lighting, neutral expression, casual pose
```

**Negative:** default

**Pass criteria** (check each per image):

*Mirror selfie composition (the headline test):*
- ✅ One coherent person visible in the mirror reflection
- ✅ One phone visible, held in hand at a plausible position (chest/face level)
- ✅ Mirror reflection physics are coherent (one body, no doubled face, no impossible camera angle)
- ❌ Two phones / three hands / floating phone / phone duplicated in/out of mirror
- ❌ Two faces (one inside mirror, one outside) when there should only be a reflection
- ❌ Not a mirror selfie — defaulted to plain selfie or 3rd-person photo

*Framing:*
- ✅ Full body visible in the mirror reflection (head to feet/thighs)
- ❌ Cropped tightly at upper body despite "full body visible in mirror" prompt

*Outfit:*
- ✅ White tank top AND grey sweatpants (both items, as described)
- ❌ Different top / different bottoms / one item missing

*Setting:*
- ✅ Bathroom (visible bathroom features: vanity, sink, towels, tile)
- ❌ Bedroom / hallway / generic room

*Lighting:*
- ✅ Harsh overhead vanity lighting (direct, somewhat unflattering, top-down)
- ❌ Soft natural light / golden hour / warm-toned (would suggest different setting)

*Pose & gaze:*
- ✅ Casual pose, neutral expression
- ✅ Looking at camera (i.e., at the mirror) — selfie-appropriate
- ❌ Posed / glamour pose / smiling broadly

*Anatomy:*
- ✅ Hands look anatomically correct (5 fingers, plausible articulation)
- ✅ Body proportions normal
- ❌ Melted fingers, missing/extra digits, deformed limbs

*Modesty:*
- ✅ Tank top covers chest, sweatpants cover legs (this is tier-2, no skin reveal expected)
- ❌ Outfit modified to be more revealing than prompted

*Aesthetic (qualitative):*
- Does the bathroom scene look real or too obviously AI?
- Is the iPhone identifiable as an iPhone, or a generic-looking phone-shape?

---

## Scenario 4 — Tier-3 lingerie shot

**What we're testing:** NSFW handling, anatomy, hand quality, body framing. This is gating content for Phase 5 paid platform.

**Resolution:** 832 × 1216

**Prompt:**
```
amateur photo, photorealistic, young woman, jet black hair, fair skin, large breasts, wearing black lace lingerie, lying on bed, full body visible, soft warm lamp light, looking at camera, slight smirk, hand on hip
```

**Negative:** default

**Pass criteria** (check each per image):

*NSFW handling (the headline test):*
- ✅ Base produces lingerie content (not refused, not output-clothed)
- ✅ Lingerie is the prompted style (black lace), not arbitrary
- ❌ Base refuses NSFW (output is censored / clothed despite explicit prompt)
- ❌ Output is clothed in non-lingerie attire (e.g., regular underwear, full pajamas)
- ❌ Output goes further than prompted (full nudity when lingerie was specified) — a deal-breaker for controllability

*Anatomy (gating for Phase 5 paid content):*
- ✅ Hands look anatomically correct (5 fingers, plausible articulation)
- ✅ All limbs present and correctly placed (two arms, two legs, no spurious extras)
- ✅ Face is anatomically normal (eyes aligned, no warping)
- ✅ Body proportions look realistic
- ❌ Melted hands / missing fingers / extra fingers
- ❌ Spurious or missing limbs
- ❌ Distorted face / asymmetric features

*Body type compliance:*
- ✅ Subject reads as having larger chest (the `large breasts` prompt token is honored)
- ❌ Default medium / small chest despite explicit prompt (prompt-following fail)

*Framing:*
- ✅ Full body visible (head to feet/thighs at minimum, ideally all the way to feet)
- ❌ Cropped tightly at upper body / chest

*Pose:*
- ✅ Lying on bed, hand on hip
- ❌ Standing / sitting / lying without "hand on hip" pose

*Setting:*
- ✅ On a bed (bedding, headboard, pillows visible)
- ❌ Studio backdrop / floor / generic surface

*Lighting:*
- ✅ Soft warm lamp light (warm-toned, soft shadows, suggests evening)
- ❌ Harsh / cold / daylight (would clash with lingerie aesthetic)

*Gaze & expression:*
- ✅ Looking at camera with slight smirk
- ❌ Looking away / wrong expression (open-mouth pose, blank stare, etc.)

*Aesthetic (qualitative — important for paid content):*
- Does it look like sellable / postable NSFW content, or "obviously AI" enough that a paying customer wouldn't accept it?
- Does the body look real or like a CGI mannequin?

If gonzalomo wins everything else but Juggernaut/RealVisXL fail tier-3, that triggers the dual-base path discussion.

---

## Scenario 5 — Outdoor full body, golden hour

**What we're testing:** lighting variety + scene context + framing — combined stress test.

**Resolution:** 768 × 1344

**Prompt:**
```
amateur photo, photorealistic, full body shot, head to toe visible, photographed from medium distance, young woman, jet black hair, fair skin, wearing white linen sundress, walking on outdoor park trail, golden hour warm backlight, looking off camera, soft smile, trees in background, candid
```

**Negative:** default

**Pass criteria** (check each per image):

*Framing (re-tests scenario 2 under different scene):*
- ✅ Full body in frame — head to feet visible
- ❌ Cropped at thighs / knees / ankles / toes
- ❌ Selfie framing (this is a **3rd-person candid**, NOT a selfie)
- *Note: camera distance ("medium distance") is logged but NOT scored — same ecosystem limitation as scenario 2*

*Outfit:*
- ✅ White linen sundress (white color, light/flowy fabric, dress silhouette)
- ❌ Different outfit (jeans, pants, different color dress, different fabric type)

*Pose & motion:*
- ✅ Walking pose (one foot ahead of other, motion implied)
- ❌ Standing static / sitting / posing
- ✅ Looking off-camera (not at lens)
- ❌ Looking directly at camera

*Setting:*
- ✅ Outdoor park trail with trees in background
- ❌ Indoor / urban / beach / non-park setting
- ❌ No trees visible

*Lighting (the headline test alongside framing):*
- ✅ Golden hour visible — warm backlight, sun-low-on-horizon glow, warm color temperature
- ✅ Backlit (sun behind subject, possibly some lens flare or rim light on hair/dress)
- ❌ Flat / midday / blue-hour lighting
- ❌ Sun directly overhead / front-lit

*Anatomy:*
- ✅ Two arms, two legs, all fingers, no spurious limbs
- ✅ Face is anatomically normal
- ❌ Missing/extra limbs, deformed face

*Expression:*
- ✅ Soft smile (subtle, candid feel)
- ❌ Wide grin / neutral / wrong expression

*Aesthetic (qualitative):*
- Does the outdoor scene read as a real photographed location, or obviously generated?
- Does the dress + lighting + walking pose come together as a coherent moment, or feel disjointed?
- Does the golden hour light look natural, or like an Instagram filter applied on top?

---

## After running all bases

1. Fill in `base_evaluation_results.md` with per-scenario scores + observations.
2. Look at the aggregate. Three possible outcomes:
   - **Single base wins all 5** → that's the v3 training base. Done.
   - **Two bases split — one wins tier-2 (scenarios 1, 2, 3, 5), one wins tier-3 (scenario 4)** → dual-base path. Train two v3 LoRAs. Cost +$3-5 and more discipline at inference, but unlocks both tiers cleanly.
   - **No clear winner — every base fails ≥1 scenario significantly** → consider IP-Adapter at inference time as a no-train alternative (see `V3_PLANNING.md` open questions). Or accept gonzalomo's compromises and proceed with one tier-2-only persona.
3. Update `V3_PLANNING.md` Status section + `prompts.md` production base lock with the decision.
