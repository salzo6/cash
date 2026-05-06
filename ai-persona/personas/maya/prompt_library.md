# Prompt Library — `maya`

Copy-paste-ready prompts for testing Maya across scenarios. Add to this as you discover what works; remove dead ends.

For locked production settings (per-base sampler/steps/CFG/weight) see `prompts.md`. This file is just the prompts.

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
