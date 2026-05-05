# Prompts — `maya`

The locked prompt formula for Maya Cole. Update as you iterate; this file is the source of truth for what gets generated.

---

## Identity tokens (always include)

These are the visual anchors that must appear in every positive prompt to keep the face consistent. Paste verbatim — no rephrasing.

```
1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body
```

---

## Style tokens

The aesthetic / camera / lighting fingerprint. Goes in every prompt, before the variation tokens.

```
amateur photo, photorealism, photorealistic
```

---

## LoRA trigger

**Phase 2 (custom Maya LoRA):** `mayacole_persona` — the unique token the trained LoRA will respond to. Goes at the **start** of every Flux prompt once the LoRA is trained.

**Phase 1 (legacy, base model only):** `gonzalomo-amateur` — included in original generation prompts but had no effect (the LoRA wasn't actually loaded). Inert text. Drop from any future prompts.

---

## Negative prompt (always include)

```
cartoon, illustration, anime, painting, 3d render, cgi, low quality, blurry, deformed, asymmetric eyes, lazy eye, distorted face, deformed face, airbrushed skin, plastic skin, extra fingers, extra limbs, bad hands, malformed fingers, watermark, text, signature, logo, username
```

---

## Locked seed (Phase 1 only)

Until the LoRA exists, lock the seed for consistency.

- **Seed:** `1784676583`
- **Sampler:** DPM++ 2M Karras
- **Steps:** 28
- **CFG:** 5
- **LoRA weight:** 60% (selfies) / 50% (non-selfie shots)
- **Resolution:** 832 × 1216 (4:5 vertical, IG feed standard)
- **Base model:** Juggernaut XL v9 8-bit *(or whatever's currently loaded — note when changed)*

Once the LoRA is trained (Phase 2), seed-locking is no longer needed — the LoRA enforces identity.

---

## Full prompt template

```
amateur photo, photorealism, photorealistic, 1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, medium breasts, fit body, [VARIATION TOKENS HERE], gonzalomo-amateur
```

Only the `[VARIATION TOKENS HERE]` section changes between shots. Identity + style + trigger stay locked.

---

## Shot variations

A library of prompt fragments to combine with the locked block. Add to this as you discover what works.

### Selfies (LoRA's strongest domain)

- *selfie, 24mm lens, upper body, [setting], [outfit], [lighting], [expression]*
- *mirror selfie, full body, holding phone, [setting], [outfit], [lighting]*
- *bathroom mirror selfie, waist up, holding iphone, [outfit], harsh overhead vanity lighting*
- *car selfie, sitting in driver seat, seatbelt visible, [outfit], soft natural daylight*

### Candid / non-selfie (drop `selfie`, `24mm lens`, `looking at viewer`)

- *full body shot, walking down [setting], candid photo from across the street, [outfit], looking ahead not at camera*
- *sitting at coffee shop table, candid photo, holding coffee cup, [outfit], looking out window*
- *standing at kitchen counter, [activity], candid photo, [outfit], soft morning light*
- *side profile, standing by window, looking outside, [outfit], soft window light*
- *full body shot, photographed from straight on, against textured wall, hand on hip, [outfit]*

### Settings to rotate

bedroom · bathroom · kitchen · living room · coffee shop · gym · car · pool · beach · outdoor street · park trail · forest

### Outfits to rotate

black tank top · oversized white t-shirt · grey hoodie · cream sweater · fitted black turtleneck · sports bra and leggings · white linen sundress · black bikini · black lace lingerie · oversized button-up

### Lighting to rotate

soft morning light through window · golden hour warm backlight · harsh overhead lighting · dim evening lamp light · bright midday sun · warm indoor café lighting · dappled sunlight through trees

### Expressions to rotate

closed mouth smirk · soft smile · slight smile with teeth · neutral · contemplative · biting lip · laughing

---

## Things this persona does NOT post

Define before you start. Edits are fine; mid-stream pivots into content you weren't comfortable with isn't.

- *(fill in)*
- *(fill in)*

---

## Iteration log

Notes on what's worked / failed. Append-only — keeps you from re-trying dead ends.

| Date | Change tested | Result |
|---|---|---|
| 2026-05-04 | LoRA at 70%+ with stacked Civitai trigger tokens | Melted faces — dropped to 60% selfies / 50% non-selfies |
| 2026-05-04 | `(selfie:1.2)` attention syntax | Draw Things parsing issue, contributes to artifacts — use `selfie` plain |
| 2026-05-04 | `lowres`, `webcam photo`, `grainy` tokens | Degrades output instead of stylizing — avoid |
| 2026-05-04 | Image-to-image with mismatched aspect ratio | Source superimposes on generated background, no blending — keep canvas at source aspect |
