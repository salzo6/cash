# Prompt Library — `maya`

Copy-paste-ready prompts for testing Maya across scenarios. Add to this as you discover what works; remove dead ends.

For locked production settings (per-base sampler/steps/CFG/weight) see `prompts.md`. This file is just the prompts.

---

## Engineered production prompts (gonzalomo, 2026-05-11 — updated for v3 LoRA 2026-05-15)

**Status:** these are the prompt structures that hit production targets during the 2026-05-10/11 prompt-engineering session, with v3 LoRA usage notes added 2026-05-15 after v3 validation. Engineering session was no-LoRA; production use is with v3 LoRA at 10% weight. Full session log in `gonzalomo_prompt_engineering.md`.

**Settings — engineering / testing (no LoRA):** LCM, 16 steps, CFG 2, gonzalomoXLFluxPony_v40 base.

**Settings — PRODUCTION (with v3 LoRA, 2026-05-15):**

- **LoRA:** `maya_lora_v3.safetensors` at **10% weight**
- **Sampler:** LCM
- **Steps:** 16
- **CFG:** 2
- **Base:** gonzalomoXLFluxPony_v40
- **Resolution:** per shot type below
- **Strategy:** over-generate 20-30 per shot type, keep the 2-6 specific-Maya hits
- **MUST prepend the v2 preamble to every prompt below:**
  ```
  mayacole_persona, jet black hair, deep dark brown eyes, freckles across nose, full lips, soft eyeliner, defined jawline, gonzalomo-amateur, amateur photo, photorealistic,
  ```
  The prompts below were tested without LoRA and don't have the preamble. For production with v3 LoRA, prepend it.

**Body-token rule with v3 LoRA loaded:** the `large breasts, busty` tokens in some prompts below are from no-LoRA testing — they work without LoRA because they call up gonzalomo's body-size prior directly. **With v3 LoRA loaded, REMOVE those tokens** — they weren't in training captions and fight the LoRA's encoded body shape. For chest emphasis with v3 LoRA, use `cleavage` via outfit description (e.g., `black lace lingerie with cleavage`).

**Freckle-compounding open finding:** preamble's `freckles across nose` + LoRA's visually-encoded freckles = freckle overdose. Acceptable for current bridge production; will be tested on v4a (drop `freckles across nose` from preamble while keeping the rest).

### Full-body 3rd person (tier-2, casual)

**Resolution:** 832 × 1472 (taller-than-default unlocks full-body framing)

**Prompt:**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, full body shot from head to toe, complete body visible from feet to head, full length portrait, standing pose with shoes visible, 35mm lens wide shot, [outfit], [setting], casual stance, candid, looking ahead not at camera, [lighting]
```

**Negative:**
```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands, cropped, close-up, headshot, upper body only, cropped at knees, cropped at ankles, cropped at thighs, partial body, feet not visible
```

**Locked at:** 6/6 full body hit rate during experiment 1. The 35mm lens swap (was 24mm — selfie focal length) is the biggest lever; stacked head-to-toe tokens + anti-crop negative + taller resolution lock it.

### Tier-3 NSFW lingerie (lying on bed)

**Resolution:** 832 × 1216

**Prompt:**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, young woman, large breasts, busty, wearing black lace lingerie, lying on bed, full body visible, soft warm lamp light, looking at camera, slight smirk, hand on hip, bedroom setting
```

**Negative:** default

**Locked at:** 6/6 lingerie + 4/6 clean anatomy + sellable for paid platform during experiment 2. Body type token honored. Framing was 0/6 full body — for standing-lingerie, apply experiment 1's framing fix on top of this base prompt.

### Mirror selfie (with over-generation budget)

**Resolution:** 832 × 1216

**Prompt:**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, mirror selfie in front of single bathroom mirror, no other mirrors visible, holding iphone in hand, full body visible in mirror reflection, [outfit], harsh overhead vanity lighting, neutral expression, casual pose, only one person in scene
```

**Negative:**
```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands, multiple mirrors, second mirror, reflection of a reflection, two people, two women, duplicate person, mirror within mirror, double exposure
```

**Production strategy:** ~33% rejection rate from gonzalomo's stochastic recursive-mirror artifact. Anti-recursive tokens help but don't eliminate. **Over-generate by ~50% (generate 9 to keep 6).** Hard limit confirmed during experiment 3.

### Awkward / yoga / non-standard poses (tier-2)

**Resolution:** 1216 × 832 (landscape — wider for horizontal/folded poses)

**Prompt:**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, candid photo, [specific pose description], [outfit], [setting with environmental details], [lighting]
```

**Negative:**
```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands, broken back, contorted spine, impossible pose
```

**Locked at:** clean pass during scenario 6 (downward dog). Gonzalomo handles non-standard poses without breaking anatomy. No special engineering needed beyond standard prompt structure + the anti-impossible-pose negatives.

### Outdoor tier-3 NSFW (pool/beach)

**Resolution:** 832 × 1472

**Prompt:**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, third person photo, candid photograph from poolside, photographer standing on pool deck, full body shot from head to toe, complete body visible from feet to head, 35mm lens wide shot, young woman, large breasts, wearing modest padded triangle bikini top and matching bikini bottoms, swimwear catalogue style photo, standing barefoot on pool deck next to swimming pool, looking at camera, slight smirk, harsh midday sun overhead, palm trees and pool deck in background, vacation setting
```

**Negative:**
```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands, cropped, close-up, headshot, upper body only, cropped at knees, cropped at ankles, cropped at thighs, partial body, feet not visible, selfie, mirror selfie, holding phone, looking at phone, arm extended toward camera, topless, no top, exaggerated breasts, unrealistic body proportions, in water, swimming, submerged
```

**Production strategy:** ~33% rejection rate (some images render her standing on water surface). Reached after iteration 2 of scenario 7. **Drop `water dripping from hair and body` if you want zero surreal-water artifacts.** Over-generate.

### Prompt design rules (cumulative across scenarios)

Compiled from the 2026-05-10/11 session. Apply to all gonzalomo prompts going forward:

1. **One size token max.** `large breasts` alone = noticeably larger. Adding `busty` doubles up. Adding `skimpy` triples up into unrealistic. Pony bases respond literally.
2. **Nudity/coverage language in negative ONLY.** Positive descriptions of "nipples covered" or "full coverage" inadvertently boost the nudity concept. Describe what the garment IS, not what it isn't.
3. **Anti-selfie has to be active.** For non-selfie outdoor or vacation NSFW, explicitly negate `selfie, holding phone, arm extended` AND signal photographer presence in positive (`third person photo, photographer standing on...`).
4. **Avoid wet+on-deck contradictions.** Mixing "water dripping" with "standing on deck" produces surreal backgrounds (walk-on-water effect).
5. **Don't mention mirrors unless mirror is the literal subject.** Triggers gonzalomo's recursive-mirror artifact at ~33% baseline.
6. **Avoid gym settings.** Hard category limit — "multi-person + mirror walls" prior is too strong to prompt-engineer away. Substitute home yoga, outdoor running, etc.
7. **NSFW context resists framing fix partially.** Same engineering hits 6/6 on standing-casual but only 3/6 on standing-lingerie. Budget over-generation for NSFW full body.

### Production envelope (gonzalomo, pre-v3)

| Shot type | Status | Rejection rate budget |
|---|---|---|
| Modest IG selfie | ✅ Locked | ~17% (gonzalomo selfie default works well) |
| Full-body 3rd person (casual) | ✅ Locked | ~17% (with engineered prompt) |
| Tier-3 lingerie lying | ✅ Locked | ~17% (body/anatomy clean) |
| Tier-3 lingerie standing (full body) | ⚠️ Partial | ~50% (framing fix only 3/6 in NSFW context) |
| Mirror selfies | ⚠️ Stochastic | ~33% (recursive-mirror artifact) |
| Awkward / yoga poses | ✅ Locked | ~17% |
| Outdoor tier-3 (pool/beach) | ⚠️ Iterated | ~33% (surreal water artifacts) |
| Gym workouts | ❌ Hard limit | Avoid — substitute home/outdoor alternatives |

---

## Universal pieces (use with every prompt below)

### Negative prompt (paste verbatim)

```
cartoon, illustration, anime, painting, 3d render, low quality, blurry, deformed, asymmetric eyes, distorted face, plastic skin, watermark, text, signature, extra fingers, malformed fingers, bad hands
```

### Trigger logic

- **All prompts start with `mayacole_persona`** — the LoRA trigger.
- **Add `gonzalomo-amateur`** right after if base is `gonzalomoXLFluxPony_v40`. Drop it for any other base (Lustify, Juggernaut, RealVisXL).
- **Add `large breasts, busty`** right after the triggers if you want bigger chest. Bump LoRA weight from 60% → 75–80% for stronger expression.

---

## Tier 2 — Semi-provocative / IG-safe

### Selfies (LoRA's strongest territory)

**Indoor selfie, black tank top, soft window light**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, selfie, 24mm lens, upper body, indoor bedroom, black tank top, soft natural window light, looking at camera, slight smile
```

**Bathroom mirror selfie, vanity lighting**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, mirror selfie, bathroom, holding phone, white t-shirt, harsh overhead vanity lighting, neutral expression
```

**Bedroom mirror selfie, full body**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, mirror selfie, bedroom, full body, holding phone, oversized white t-shirt and shorts, soft afternoon light
```

**Car selfie, daylight**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, car selfie, sitting in driver seat, seatbelt visible, grey hoodie, soft natural daylight, slight smile
```

**Gym mirror selfie, athletic**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, gym mirror selfie, sports bra and leggings, holding phone, fluorescent overhead light, neutral expression
```

**Outdoor park selfie, golden hour**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, outdoor selfie, park trail, white tank top, golden hour warm backlight, soft smile
```

### Candid / non-selfie shots

**Coffee shop, sitting, looking out window**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, candid photo, sitting at coffee shop table, holding coffee cup, cream sweater, looking out window, warm indoor lighting
```

**Kitchen counter, morning light**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, candid photo, standing at kitchen counter, oversized button-up shirt, soft morning light, neutral expression
```

**Walking outdoor street, full body**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, full body shot, walking outdoor street, candid photo, fitted black turtleneck and jeans, looking ahead not at camera, overcast lighting
```

**Side profile by window**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, side profile, standing by window, looking outside, white linen sundress, soft window light, contemplative expression
```

### Lifestyle / activity shots

**Lying on bed, headshot**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, lying on bed, headshot, oversized grey hoodie, soft morning light, contemplative expression
```

**Lying on bed, upper body**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, lying on bed, upper body, propped on elbow, white tank top, soft afternoon light
```

**Beach, casual**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, candid photo, sitting on beach, black tank top, golden hour, looking off camera, slight smile
```

---

## Tier 3 — NSFW / Fanvue

These work better at LoRA weight 75–80% with `large breasts, busty` added. Pony-derived bases (gonzalomo, Lustify) respond more directly to body tokens than vanilla SDXL fine-tunes.

**Bedroom lingerie selfie**
```
mayacole_persona, gonzalomo-amateur, large breasts, busty, amateur photo, photorealistic, selfie, bedroom, black lace lingerie, soft lamp light, looking at camera, slight smirk
```

**Mirror bedroom robe**
```
mayacole_persona, gonzalomo-amateur, large breasts, busty, amateur photo, photorealistic, mirror selfie, bedroom, white silk robe partially open, holding phone, dim evening light
```

**Pool bikini**
```
mayacole_persona, gonzalomo-amateur, large breasts, busty, amateur photo, photorealistic, selfie, pool, black bikini, wet hair, harsh midday sun, slight smile
```

**Balcony bikini, sunset**
```
mayacole_persona, gonzalomo-amateur, large breasts, busty, amateur photo, photorealistic, balcony, gold bikini, sunset golden backlight, looking at camera
```

**Lying on bed, lingerie**
```
mayacole_persona, gonzalomo-amateur, large breasts, busty, amateur photo, photorealistic, lying on bed, full body, black lace lingerie, hair fanned out on pillow, soft warm lamp light
```

**Bath tub, implied nude**
```
mayacole_persona, gonzalomo-amateur, large breasts, busty, amateur photo, photorealistic, sitting in bath, water up to chest, wet hair, soft bathroom light, looking at camera
```

---

## Img2img scenarios (for photoreal output)

Use these in **img2img mode** with a real source photo at **denoise 0.40–0.55**. Keep prompt minimal — let the source photo's structure carry the composition. The prompt's job is just to tell the model "this is Maya."

**Real selfie source → Maya**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, selfie, looking at camera
```

**Real mirror selfie source → Maya**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, mirror selfie, holding phone
```

**Real candid source → Maya**
```
mayacole_persona, gonzalomo-amateur, amateur photo, photorealistic, candid photo
```

Keep these short. Long prompts at low denoise fight the source image's composition.

---

## Body / appearance steering (when default isn't right)

**Bigger chest emphasis**
- Add: `large breasts, busty`
- More aggressive: `huge breasts, voluptuous`
- LoRA weight: 75–80% (default 60% may suppress)

**Smaller / athletic**
- Add: `small breasts, athletic build`
- LoRA weight: 60% works fine

**Older-looking (closer to 22 vs 18)**
- Add: `mature features, defined cheekbones`
- Avoid: `youthful, teenager` (default already skews young)

**Less makeup**
- Add: `no makeup, bare face, natural`
- Drop: `eyeliner` from any prompt

**Tired / vulnerable expression**
- Add: `tired eyes, soft expression, makeup-free, slight under-eye shadows`

**More polished / glam**
- Add: `professional makeup, contoured cheekbones, lip gloss`
- Note: pushes toward "AI portrait" aesthetic — only use deliberately

---

## Failed approaches — don't repeat (cross-reference `prompts.md` iteration log)

- `(token:1.2)` attention syntax — Draw Things parsing issue
- `lowres, webcam photo, grainy` — degrades output
- LoRA at 70%+ on a Civitai non-Maya LoRA — melted faces (legacy Phase 1 issue, not relevant for v1 LoRA)
- Img2img with mismatched aspect ratio — bizarre superimposition

---

## Add your own

When you find a prompt that works really well, paste it here in the appropriate section. When one fails consistently, log it in `prompts.md` iteration log so future you doesn't retry it.
