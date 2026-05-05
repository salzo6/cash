# Prompts — `maya`

The locked prompt formula for Maya Cole. Update as you iterate; this file is the source of truth for what gets generated.

---

## Identity tokens (Phase 2 — mostly redundant now)

The Maya LoRA encodes identity. These tokens are no longer required, but including them as anchors doesn't hurt and can help on bases that need extra steering.

```
1girl, solo, fair skin, detailed skin texture, skin fuzz, skin pores, black hair, parted on the side hair, black eyes, eyeliner, fit body
```

Note: dropped `medium breasts` from the locked block — chest size is steerable per-shot (see body steering below).

---

## Style tokens

The aesthetic / camera / lighting fingerprint. Goes in every prompt, before the variation tokens.

```
amateur photo, photorealism, photorealistic
```

---

## Trigger words

Two triggers, both useful. Lead the prompt with both.

- **`mayacole_persona`** — the Maya LoRA's identity trigger. **Required** in every prompt for the LoRA to express her face.
- **`gonzalomo-amateur`** — the trigger for the **gonzalomo SDXL checkpoint** (NOT a LoRA, despite earlier confusion). Activates gonzalomo's amateur-photo aesthetic when that's the base model. Drop this token if base is Juggernaut/RealVisXL/Lustify.

---

## Body steering (chest size)

The LoRA averaged toward medium chest because that's the dataset majority, but bigger-chest shots are in the training data (lingerie / bikini / lying-down references). To steer:

- **Default (medium):** no extra tokens needed.
- **Bigger (full / busty):** add `large breasts, busty` after the triggers; bump LoRA weight from 60% → 75–80%.
- **Maximum:** add `huge breasts` (Pony-style bases like gonzalomo respond literally); calibrate weight back down if face drifts.

---

## Negative prompt (always include)

```
cartoon, illustration, anime, painting, 3d render, cgi, low quality, blurry, deformed, asymmetric eyes, lazy eye, distorted face, deformed face, airbrushed skin, plastic skin, extra fingers, extra limbs, bad hands, malformed fingers, watermark, text, signature, logo, username
```

---

## Locked production settings (Phase 2)

The LoRA enforces identity, so seed-locking is no longer required for consistency — vary seeds freely. Settings calibrated by base model:

### gonzalomo (recommended for amateur-photo aesthetic)

- **Base model:** `gonzalomoXLFluxPony_v40` (the Phase 1 base — best photorealism match)
- **LoRA weight:** **60–78%** (sweet spot 60% for selfies, 75–80% for bigger-chest steering)
- **Sampler:** DPM++ 2M Karras
- **Steps:** 28
- **CFG:** 5
- **Resolution:** 832 × 1216 (4:5 vertical, IG feed standard)
- **Tradeoff:** best aesthetic, weakest prompt-following. Use for shots where the look matters more than precise scene control.

### Juggernaut XL v9 (alternative — better prompt control, less photoreal)

- **LoRA weight:** **80–95%** (different sweet spot than gonzalomo — more polished base needs LoRA pushed harder)
- All other settings same as above
- **Tradeoff:** obeys complex prompts but retains a "polished AI portrait" fingerprint. Use for tier-2 IG content where scene control matters.

### RealVisXL v4 (backup SFW)

- **LoRA weight:** ~91%
- More photoreal than Juggernaut, harsher / more candid lighting
- **Tradeoff:** photoreal in technical terms but aesthetic skews "raw" rather than glamour

### Lustify (tier-3 NSFW — not yet validated)

- Phase 2 didn't validate the LoRA on Lustify. Expected to work since Lustify is SDXL 1.0 derivative. Test before relying on it for paid content.

---

## Full prompt template

```
mayacole_persona, gonzalomo-amateur, [optional: large breasts, busty], amateur photo, photorealism, photorealistic, [VARIATION TOKENS HERE]
```

Trigger words first. Drop `gonzalomo-amateur` if base ≠ gonzalomo. Drop `large breasts, busty` if you want default body. Identity tokens (`1girl, fair skin, ...`) are optional — the LoRA handles them — but can be appended for extra steering on stubborn bases.

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
| 2026-05-05 | Maya LoRA (rank 16, 2000 steps) on Juggernaut XL v9 at 80–95% | Identity locked, but Juggernaut's "polished AI portrait" fingerprint dominates — looks AI-generated even with anti-glamour negatives. Salvageable for tier-2 with prompt heavy on `amateur photo, raw photo, no makeup` tokens, but not the daily-driver. |
| 2026-05-05 | Maya LoRA on RealVisXL v4 at 91% | More photoreal skin texture than Juggernaut, but lighting skews harsh and aesthetic feels "candid in a bad way." Backup option, not preferred. |
| 2026-05-05 | Maya LoRA on gonzalomoXLFluxPony_v40 at 60% | Photorealism matches Phase 1 quality, identity holds, freckles visible. **This is the production base.** Caveat: gonzalomo doesn't follow complex prompts well — use terse prompts. |
| 2026-05-05 | Default Maya output skews medium chest across seeds | LoRA averaged toward dataset majority. Fix: bump weight to 75–80% AND add `large breasts, busty` tokens — calls up the bigger-chest training shots (lingerie / bikini / lying-down framings). |
| 2026-05-05 | LoRA weight calibration is base-dependent | Same LoRA wants different weights on different bases. gonzalomo: 60–78%. Juggernaut: 80–95%. RealVisXL: ~91%. Re-calibrate when swapping bases. |
| 2026-05-05 | Phase 2 sample images (during training) on plain SDXL 1.0 base | Looked AI-generated and 2/5 didn't even show Maya. Misleading — plain SDXL 1.0 has poor photorealism baseline. Don't judge a LoRA by its training-step samples; judge it on production bases. |
